import type { Modulo } from '../config/modulos';
import { repositorio } from '../data';
import type { NuevoRegistro, Recurso, Registro } from '../types';
import { hoyALas } from '../utils/fechas';
import { generarId } from '../utils/id';

/**
 * Reglas del negocio, iguales para todos los módulos (préstamo de laptops,
 * reserva de cubículos…). Los componentes llaman a estas funciones y nunca
 * hablan directamente con el almacenamiento.
 */

export function estaVencido(registro: Registro, ahora = new Date()): boolean {
  return !registro.finReal && !!registro.fin && new Date(registro.fin) < ahora;
}

/** Crea los recursos del módulo (sus opciones del menú) que todavía no existan. */
export async function asegurarRecursos(modulo: Modulo): Promise<void> {
  const existentes = new Set((await repositorio.listarRecursos(modulo.tablaRecursos)).map((r) => r.id));
  for (const [i, id] of modulo.opciones.entries()) {
    if (!existentes.has(id)) {
      await repositorio.guardarRecurso(modulo.tablaRecursos, { id, numero: i + 1, estado: 'disponible' });
    }
  }
}

export async function cambiarMantenimiento(modulo: Modulo, recurso: Recurso, enMantenimiento: boolean) {
  if (recurso.estado === 'ocupado') {
    throw new Error(`No se puede cambiar el estado: está en uso (${modulo.ocupado.toLowerCase()}).`);
  }
  await repositorio.guardarRecurso(modulo.tablaRecursos, {
    ...recurso,
    estado: enMantenimiento ? 'mantenimiento' : 'disponible',
  });
}

export async function registrar(modulo: Modulo, datos: NuevoRegistro): Promise<Registro> {
  const recursos = await repositorio.listarRecursos(modulo.tablaRecursos);
  const recurso = recursos.find((r) => r.id === datos.recursoId);
  if (!recurso) throw new Error(`Seleccione un ${modulo.recurso.toLowerCase()}.`);
  if (recurso.estado !== 'disponible') {
    throw new Error(`${modulo.recurso} ${recurso.id} no está disponible.`);
  }

  const inicio = hoyALas(datos.horaInicio);
  const fin = modulo.conHoraFin ? hoyALas(datos.horaFin) : undefined;
  if (fin && fin <= inicio) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
  }

  const registro: Registro = {
    id: generarId(),
    recursoId: recurso.id,
    nombre: datos.nombre.trim(),
    instituto: datos.instituto,
    condicion: datos.condicion,
    carrera: datos.carrera,
    motivo: datos.motivo,
    inicio: inicio.toISOString(),
    fin: fin?.toISOString(),
  };
  await repositorio.guardarRegistro(modulo.tablaRegistros, registro);
  await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'ocupado' });
  return registro;
}

/** Devuelve la laptop o libera el cubículo; la hora de fin real es la del momento. */
export async function finalizar(modulo: Modulo, registro: Registro) {
  await repositorio.guardarRegistro(modulo.tablaRegistros, {
    ...registro,
    finReal: new Date().toISOString(),
  });
  const recursos = await repositorio.listarRecursos(modulo.tablaRecursos);
  const recurso = recursos.find((r) => r.id === registro.recursoId);
  if (recurso) await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'disponible' });
}
