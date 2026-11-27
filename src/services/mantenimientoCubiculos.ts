import { CUBICULOS, nombreRecurso } from '../config/modulos';
import { repositorio } from '../data';
import type { MantenimientoCubiculo, Recurso, Registro } from '../types';
import { diaALas, diaDe } from '../utils/fechas';
import { generarId } from '../utils/id';
import { textoMantenimiento, type NuevoMantenimiento } from './mantenimientoSalas';

export const TABLA_MANTENIMIENTO_CUBICULOS = 'mantenimiento_cubiculos';

export const enMantenimiento = (m: MantenimientoCubiculo, ahora: Date) =>
  new Date(m.inicio) <= ahora && (!m.fin || new Date(m.fin) > ahora);

export function mantenimientoCubiculoQueChoca(lista: MantenimientoCubiculo[], recursoId: string, inicio: Date, fin: Date) {
  return lista.find((m) => m.recursoId === recursoId && new Date(m.inicio) < fin && (!m.fin || inicio < new Date(m.fin)));
}

/** Estado calculado por horario; no cambia el estado permanente del recurso. */
export function recursosConMantenimiento(recursos: Recurso[], lista: MantenimientoCubiculo[], ahora = new Date()): Recurso[] {
  return recursos.map((r) => lista.some((m) => m.recursoId === r.id && enMantenimiento(m, ahora)) ? { ...r, estado: 'mantenimiento' } : r);
}

/** Se usa también al editar, mover o crear una serie de reservas. */
export function revisarMantenimientoCubiculo(lista: MantenimientoCubiculo[], recursoId: string, inicio: Date, fin: Date) {
  const choque = mantenimientoCubiculoQueChoca(lista, recursoId, inicio, fin);
  if (choque) throw new Error(`Cubículo ${nombreRecurso(recursoId)} en mantenimiento ${textoMantenimiento(choque)}.`);
}

export async function programarMantenimientoCubiculo(datos: NuevoMantenimiento, ahora = new Date()): Promise<MantenimientoCubiculo> {
  if (!CUBICULOS.opciones.includes(datos.salaId)) throw new Error('Seleccione un cubículo.');
  if (!datos.fecha || !datos.hora) throw new Error('Indique la fecha y la hora en que comienza el mantenimiento.');
  const inicio = diaALas(datos.fecha, datos.hora);
  if (!Number.isFinite(inicio.getTime()) || datos.fecha < diaDe(ahora)) throw new Error('El mantenimiento debe comenzar hoy o en una fecha futura válida.');
  let fin: Date | undefined;
  if (datos.fechaFin || datos.horaFin) {
    if (!datos.fechaFin || !datos.horaFin) throw new Error('Complete la fecha y la hora de fin o deje ambas vacías.');
    fin = diaALas(datos.fechaFin, datos.horaFin);
    if (!Number.isFinite(fin.getTime()) || fin <= inicio) throw new Error('El fin del mantenimiento debe ser posterior a su comienzo.');
  }
  const lista = await repositorio.listarMantenimientosCubiculos();
  revisarMantenimientoCubiculo(lista, datos.salaId, inicio, fin ?? new Date(8.64e15));
  const m: MantenimientoCubiculo = {
    id: generarId(), recursoId: datos.salaId, inicio: inicio.toISOString(),
    ...(fin ? { fin: fin.toISOString() } : {}), ...(datos.nota.trim() ? { nota: datos.nota.trim() } : {}), creado: ahora.toISOString(),
  };
  await repositorio.guardarMantenimientoCubiculo(m);
  window.dispatchEvent(new Event('biblioteca:cambio'));
  return m;
}

export async function terminarMantenimientoCubiculo(m: MantenimientoCubiculo, ahora = new Date()) {
  if (new Date(m.inicio) >= ahora) await repositorio.borrarMantenimientoCubiculo(m.id);
  else await repositorio.guardarMantenimientoCubiculo({ ...m, fin: ahora.toISOString() });
  window.dispatchEvent(new Event('biblioteca:cambio'));
}

export function reservasAfectadas(m: MantenimientoCubiculo, registros: Registro[]) {
  return registros.filter((r) => !r.finReal && r.recursoId === m.recursoId && new Date(r.inicio) < (m.fin ? new Date(m.fin) : new Date(8.64e15)) && (!r.fin || new Date(r.fin) > new Date(m.inicio)));
}
