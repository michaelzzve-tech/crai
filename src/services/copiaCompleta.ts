import { MODULOS } from '../config/modulos';
import { repositorio } from '../data';
import type { Recurso, Registro, ReservaSala } from '../types';
import { diaDe } from '../utils/fechas';
import { EVENTO_CAMBIO } from './registroService';
import { verificar } from './reinicio';

/** Palabra que se escribe para confirmar la importación cuando no hay base de datos. */
export const PALABRA_IMPORTAR = 'REEMPLAZAR';

const FORMATO = 'crai-copia-completa';
const VERSION = 1;

/**
 * Copia de toda la información del sistema, tabla por tabla, tal como la
 * guarda la aplicación: las laptops y cubículos (con su estado), los préstamos,
 * las reservas de cubículos y las de salas especiales.
 */
export interface CopiaCompleta {
  formato: typeof FORMATO;
  version: number;
  creada: string; // ISO 8601
  recursos: Record<string, Recurso[]>; // Por tabla: "laptops", "cubiculos"
  registros: Record<string, Registro[]>; // Por tabla: "prestamos", "reservas"
  reservasSalas: ReservaSala[];
}

/** Cuántos elementos trae una copia, para mostrarlos antes de importar. */
export interface ResumenCopia {
  creada: string;
  partes: { titulo: string; cantidad: number }[];
}

/** Lee todas las tablas y arma la copia. */
async function armarCopia(): Promise<CopiaCompleta> {
  const recursos: Record<string, Recurso[]> = {};
  const registros: Record<string, Registro[]> = {};
  for (const m of MODULOS) {
    recursos[m.tablaRecursos] = await repositorio.listarRecursos(m.tablaRecursos);
    registros[m.tablaRegistros] = await repositorio.listarRegistros(m.tablaRegistros);
  }
  const reservasSalas = await repositorio.listarReservasSalas();
  return { formato: FORMATO, version: VERSION, creada: new Date().toISOString(), recursos, registros, reservasSalas };
}

export function resumirCopia(copia: CopiaCompleta): ResumenCopia {
  return {
    creada: copia.creada,
    partes: [
      ...MODULOS.map((m) => ({ titulo: m.recursos, cantidad: copia.recursos[m.tablaRecursos]?.length ?? 0 })),
      ...MODULOS.map((m) => ({ titulo: `${m.registros} (${m.recursos.toLowerCase()})`, cantidad: copia.registros[m.tablaRegistros]?.length ?? 0 })),
      { titulo: 'Reservas de salas especiales', cantidad: copia.reservasSalas.length },
    ],
  };
}

/** Descarga un archivo .json con toda la información; sirve para restaurarla con importarCopia. */
export async function exportarCopia(): Promise<ResumenCopia> {
  const copia = await armarCopia();
  const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 1)], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `crai-copia-completa-${diaDe()}.json`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return resumirCopia(copia);
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const conId = (x: unknown) => esObjeto(x) && typeof x.id === 'string' && x.id !== '';
const conHorario = (x: unknown) => conId(x) && typeof (x as { inicio?: unknown }).inicio === 'string';

/** Lee y revisa un archivo de copia completa. Lanza un error claro si no lo es. */
export async function leerCopia(archivo: File): Promise<CopiaCompleta> {
  let datos: unknown;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es una copia completa del sistema (no se pudo leer).');
  }
  if (!esObjeto(datos) || datos.formato !== FORMATO) {
    throw new Error('El archivo no es una copia completa del sistema. Use el que descarga "Exportar copia completa".');
  }
  if (typeof datos.version !== 'number' || datos.version > VERSION) {
    throw new Error('La copia es de una versión más nueva del sistema; actualice la página e intente de nuevo.');
  }
  const { recursos, registros, reservasSalas } = datos;
  const listas = (grupo: unknown, tablas: string[], valido: (x: unknown) => boolean) =>
    esObjeto(grupo) && tablas.every((t) => grupo[t] === undefined || (Array.isArray(grupo[t]) && grupo[t].every(valido)));
  if (
    !listas(recursos, MODULOS.map((m) => m.tablaRecursos), conId) ||
    !listas(registros, MODULOS.map((m) => m.tablaRegistros), conHorario) ||
    !Array.isArray(reservasSalas) || !reservasSalas.every(conHorario)
  ) {
    throw new Error('La copia está incompleta o dañada; no se importó nada.');
  }
  return datos as unknown as CopiaCompleta;
}

/**
 * Reemplaza toda la información por la de la copia. Primero guarda lo que
 * trae la copia y solo después borra lo que no está en ella, así que si algo
 * falla a mitad de camino no se pierde nada. Las laptops y cubículos que no
 * están en la copia se dejan como están (no hay forma de borrarlos desde aquí).
 */
export async function importarCopia(copia: CopiaCompleta, confirmacion: string): Promise<ResumenCopia> {
  await verificar(confirmacion, PALABRA_IMPORTAR);
  for (const m of MODULOS) {
    for (const r of copia.recursos[m.tablaRecursos] ?? []) await repositorio.guardarRecurso(m.tablaRecursos, r);
    const nuevos = copia.registros[m.tablaRegistros] ?? [];
    for (const r of nuevos) await repositorio.guardarRegistro(m.tablaRegistros, r);
    const ids = new Set(nuevos.map((r) => r.id));
    for (const r of await repositorio.listarRegistros(m.tablaRegistros)) {
      if (!ids.has(r.id)) await repositorio.borrarRegistro(m.tablaRegistros, r.id);
    }
  }
  for (const r of copia.reservasSalas) await repositorio.guardarReservaSala(r);
  const ids = new Set(copia.reservasSalas.map((r) => r.id));
  for (const r of await repositorio.listarReservasSalas()) {
    if (!ids.has(r.id)) await repositorio.borrarReservaSala(r.id);
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
  return resumirCopia(copia);
}

