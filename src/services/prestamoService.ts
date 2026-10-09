import { repositorio } from '../data';
import type { Laptop, NuevaLaptop, NuevoPrestamo, Prestamo } from '../types';
import { sumarHoras } from '../utils/fechas';
import { generarId } from '../utils/id';

/**
 * Reglas del negocio. Los componentes llaman a estas funciones y nunca
 * hablan directamente con el almacenamiento.
 */

export function estaVencido(prestamo: Prestamo, ahora = new Date()): boolean {
  return !prestamo.fechaDevolucion && new Date(prestamo.fechaLimite) < ahora;
}

export async function registrarLaptop(datos: NuevaLaptop): Promise<Laptop> {
  const laptops = await repositorio.listarLaptops();
  const codigo = datos.codigo.trim().toUpperCase();
  if (laptops.some((l) => l.codigo === codigo)) {
    throw new Error(`Ya existe una laptop con el código ${codigo}.`);
  }
  const laptop: Laptop = { ...datos, codigo, id: generarId(), estado: 'disponible' };
  await repositorio.guardarLaptop(laptop);
  return laptop;
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

export async function eliminarLaptop(laptop: Laptop) {
  if (laptop.estado === 'prestada') {
    throw new Error('No se puede eliminar una laptop que está prestada.');
  }
  await repositorio.eliminarLaptop(laptop.id);
}

export async function prestarLaptop(datos: NuevoPrestamo): Promise<Prestamo> {
  const laptops = await repositorio.listarLaptops();
  const laptop = laptops.find((l) => l.id === datos.laptopId);
  if (!laptop) throw new Error('La laptop seleccionada no existe.');
  if (laptop.estado !== 'disponible') {
    throw new Error(`La laptop ${laptop.codigo} no está disponible.`);
  }

  const prestamos = await repositorio.listarPrestamos();
  const carnet = datos.estudianteCarnet.trim();
  if (prestamos.some((p) => p.estudianteCarnet === carnet && !p.fechaDevolucion)) {
    throw new Error(`El carnet ${carnet} ya tiene una laptop prestada.`);
  }

  const ahora = new Date();
  const prestamo: Prestamo = {
    id: generarId(),
    laptopId: laptop.id,
    estudianteNombre: datos.estudianteNombre.trim(),
    estudianteCarnet: carnet,
    estudianteCorreo: datos.estudianteCorreo?.trim() || undefined,
    encargado: datos.encargado.trim(),
    fechaPrestamo: ahora.toISOString(),
    fechaLimite: sumarHoras(ahora, datos.horas).toISOString(),
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
