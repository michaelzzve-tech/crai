import { salaPorId } from '../config/salas';
import { repositorio } from '../data';
import type { MantenimientoSala } from '../types';
import { diaALas, diaDe, formatearDia, formatearHora } from '../utils/fechas';
import { generarId } from '../utils/id';

/**
 * Mantenimiento de salas especiales: desde la fecha y hora elegidas la sala aparece
 * "En mantenimiento" y no se puede reservar, hasta que se marque disponible (o hasta
 * la fecha de fin, si se indicó).
 */

/**
 * Mantenimientos guardados. Si la tabla todavía no existe en la base de datos (falta
 * correr el script de supabase/salas-especiales.sql), devuelve una lista vacía para
 * que el resto del módulo siga funcionando.
 */
export async function listarMantenimientosSalas(): Promise<MantenimientoSala[]> {
  try {
    return await repositorio.listarMantenimientosSalas();
  } catch {
    return [];
  }
}

/** Si el mantenimiento cubre ese momento. */
export const enCurso = (m: MantenimientoSala, ahora: Date) =>
  new Date(m.inicio) <= ahora && (!m.fin || new Date(m.fin) > ahora);

/** El mantenimiento de la sala que se cruza con el horario dado, si hay alguno. */
export function mantenimientoQueChoca(lista: MantenimientoSala[], salaId: string, inicio: Date, fin: Date): MantenimientoSala | undefined {
  return lista.find((m) => m.salaId === salaId && new Date(m.inicio) < fin && (!m.fin || inicio < new Date(m.fin)));
}

/** Texto corto para avisos: "desde el 05/11, 2:00 p. m." (y "hasta…" si tiene fin). */
export function textoMantenimiento(m: MantenimientoSala): string {
  const desde = `desde el ${formatearDia(diaDe(m.inicio))}, ${formatearHora(m.inicio)}`;
  return m.fin ? `${desde} hasta el ${formatearDia(diaDe(m.fin))}, ${formatearHora(m.fin)}` : desde;
}

export interface NuevoMantenimiento {
  salaId: string;
  fecha: string; // "AAAA-MM-DD"
  hora: string; // "HH:MM"
  fechaFin: string; // Opcional: vacío = hasta marcarla disponible
  horaFin: string;
  nota: string;
}

/** Manda la sala a mantenimiento desde la fecha y hora elegidas. */
export async function programarMantenimiento(datos: NuevoMantenimiento, ahora = new Date()): Promise<MantenimientoSala> {
  const sala = salaPorId(datos.salaId);
  if (!sala) throw new Error('Seleccione una sala.');
  if (!datos.fecha || !datos.hora) throw new Error('Indique la fecha y la hora en que comienza el mantenimiento.');
  const inicio = diaALas(datos.fecha, datos.hora);
  if (datos.fecha < diaDe(ahora)) throw new Error('El mantenimiento no puede comenzar en un día pasado.');
  let fin: Date | undefined;
  if (datos.fechaFin || datos.horaFin) {
    if (!datos.fechaFin || !datos.horaFin) throw new Error('Para indicar el fin, complete la fecha y la hora de fin (o deje ambas vacías).');
    fin = diaALas(datos.fechaFin, datos.horaFin);
    if (fin <= inicio) throw new Error('El fin del mantenimiento debe ser posterior a su comienzo.');
  }

  const existentes = await repositorio.listarMantenimientosSalas();
  const choque = mantenimientoQueChoca(existentes, sala.id, inicio, fin ?? new Date(8.64e15));
  if (choque) throw new Error(`${sala.nombre} ya tiene un mantenimiento ${textoMantenimiento(choque)}.`);

  const mantenimiento: MantenimientoSala = {
    id: generarId(),
    salaId: sala.id,
    inicio: inicio.toISOString(),
    ...(fin ? { fin: fin.toISOString() } : {}),
    ...(datos.nota.trim() ? { nota: datos.nota.trim() } : {}),
    creado: ahora.toISOString(),
  };
  await repositorio.guardarMantenimientoSala(mantenimiento);
  return mantenimiento;
}

/**
 * Termina el mantenimiento: si ya empezó, la sala queda disponible desde ahora (se guarda
 * la hora de fin); si todavía no empezaba, se cancela.
 */
export async function terminarMantenimiento(m: MantenimientoSala, ahora = new Date()): Promise<void> {
  if (new Date(m.inicio) >= ahora) {
    await repositorio.borrarMantenimientoSala(m.id);
    return;
  }
  await repositorio.guardarMantenimientoSala({ ...m, fin: ahora.toISOString() });
}
