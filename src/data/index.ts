import { LocalStorageRepositorio } from './localStorageRepository';
import type { Repositorio } from './repository';

// Punto único donde se elige el almacenamiento. Para usar un servidor,
// cree otra clase que implemente `Repositorio` y cámbiela aquí.
export const repositorio: Repositorio = new LocalStorageRepositorio();

export type { Repositorio };
