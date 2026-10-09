import type { Laptop, Prestamo } from '../types';
import type { Repositorio } from './repository';

const CLAVE_LAPTOPS = 'biblioteca.laptops';
const CLAVE_PRESTAMOS = 'biblioteca.prestamos';

function leer<T>(clave: string): T[] {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T[]) : [];
  } catch {
    return [];
  }
}

function escribir<T>(clave: string, datos: T[]): void {
  localStorage.setItem(clave, JSON.stringify(datos));
}

function upsert<T extends { id: string }>(lista: T[], item: T): T[] {
  const existe = lista.some((x) => x.id === item.id);
  return existe ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

/** Implementación que guarda todo en el navegador (localStorage). */
export class LocalStorageRepositorio implements Repositorio {
  async listarLaptops() {
    return leer<Laptop>(CLAVE_LAPTOPS);
  }

  async guardarLaptop(laptop: Laptop) {
    escribir(CLAVE_LAPTOPS, upsert(leer<Laptop>(CLAVE_LAPTOPS), laptop));
  }

  async eliminarLaptop(id: string) {
    escribir(CLAVE_LAPTOPS, leer<Laptop>(CLAVE_LAPTOPS).filter((l) => l.id !== id));
  }

  async listarPrestamos() {
    return leer<Prestamo>(CLAVE_PRESTAMOS);
  }

  async guardarPrestamo(prestamo: Prestamo) {
    escribir(CLAVE_PRESTAMOS, upsert(leer<Prestamo>(CLAVE_PRESTAMOS), prestamo));
  }
}
