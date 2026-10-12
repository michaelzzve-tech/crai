import type { Recurso, Registro } from '../types';
import type { Repositorio } from './repository';

const clave = (tabla: string) => `biblioteca.v3.${tabla}`;

function leer<T>(tabla: string): T[] {
  try {
    const texto = localStorage.getItem(clave(tabla));
    return texto ? (JSON.parse(texto) as T[]) : [];
  } catch {
    return [];
  }
}

function escribir<T>(tabla: string, datos: T[]): void {
  try {
    localStorage.setItem(clave(tabla), JSON.stringify(datos));
  } catch {
    throw new Error('No se pudo guardar: el navegador no permite almacenamiento local.');
  }
}

function upsert<T extends { id: string }>(lista: T[], item: T): T[] {
  const existe = lista.some((x) => x.id === item.id);
  return existe ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

/** Implementación que guarda todo en el navegador (localStorage). */
export class LocalStorageRepositorio implements Repositorio {
  async listarRecursos(tabla: string) {
    return leer<Recurso>(tabla);
  }

  async guardarRecurso(tabla: string, recurso: Recurso) {
    escribir(tabla, upsert(leer<Recurso>(tabla), recurso));
  }

  async listarRegistros(tabla: string) {
    return leer<Registro>(tabla);
  }

  async guardarRegistro(tabla: string, registro: Registro) {
    escribir(tabla, upsert(leer<Registro>(tabla), registro));
  }

  async borrarRegistros(tabla: string) {
    escribir(tabla, []);
  }
}
