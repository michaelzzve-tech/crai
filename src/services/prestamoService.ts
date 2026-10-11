import { TOTAL_LAPTOPS } from '../config/opciones';
import { repositorio } from '../data';
import type { Laptop, NuevoPrestamo, Prestamo } from '../types';
import { hoyALas } from '../utils/fechas';
import { generarId } from '../utils/id';

/**
 * Reglas del negocio. Los componentes llaman a estas funciones y nunca
 * hablan directamente con el almacenamiento.
 */

export function estaVencido(prestamo: Prestamo, ahora = new Date()): boolean {
  return !prestamo.fechaDevolucion && new Date(prestamo.fechaLimite) < ahora;
}

/** Crea las laptops numeradas del 1 al TOTAL_LAPTOPS que todavía no existan. */
export async function asegurarLaptops(): Promise<void> {
  const existentes = new Set((await repositorio.listarLaptops()).map((l) => l.numero));
  for (let numero = 1; numero <= TOTAL_LAPTOPS; numero++) {
    if (!existentes.has(numero)) {
      await repositorio.guardarLaptop({ id: String(numero), numero, estado: 'disponible' });
    }
  }
}

export async function cambiarMantenimiento(laptop: Laptop, enMantenimiento: boolean) {
  if (laptop.estado === 'prestada') {
    throw new Error('No se puede cambiar el estado de una laptop prestada.');
  }
  await repositorio.guardarLaptop({
    ...laptop,
    estado: enMantenimiento ? 'mantenimiento' : 'disponible',
  });
}

export async function prestarLaptop(datos: NuevoPrestamo): Promise<Prestamo> {
  const laptops = await repositorio.listarLaptops();
  const laptop = laptops.find((l) => l.id === datos.laptopId);
  if (!laptop) throw new Error('Seleccione una laptop.');
  if (laptop.estado !== 'disponible') {
    throw new Error(`La laptop ${laptop.numero} no está disponible.`);
  }

  const inicio = hoyALas(datos.horaInicio);
  const fin = hoyALas(datos.horaFin);
  if (fin <= inicio) {
    throw new Error('La hora de fin debe ser posterior a la hora de inicio.');
  }

  const prestamo: Prestamo = {
    id: generarId(),
    laptopId: laptop.id,
    nombre: datos.nombre.trim(),
    instituto: datos.instituto,
    condicion: datos.condicion,
    carrera: datos.carrera,
    motivo: datos.motivo,
    fechaPrestamo: inicio.toISOString(),
    fechaLimite: fin.toISOString(),
  };
  await repositorio.guardarPrestamo(prestamo);
  await repositorio.guardarLaptop({ ...laptop, estado: 'prestada' });
  return prestamo;
}

export async function devolverLaptop(prestamo: Prestamo, observaciones: string) {
  await repositorio.guardarPrestamo({
    ...prestamo,
    fechaDevolucion: new Date().toISOString(),
    observacionesDevolucion: observaciones.trim() || undefined,
  });
  const laptops = await repositorio.listarLaptops();
  const laptop = laptops.find((l) => l.id === prestamo.laptopId);
  if (laptop) await repositorio.guardarLaptop({ ...laptop, estado: 'disponible' });
}
