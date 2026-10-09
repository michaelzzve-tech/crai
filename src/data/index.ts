import { LocalStorageRepositorio } from './localStorageRepository';
import type { Repositorio } from './repository';
import { supabase } from './supabaseClient';
import { SupabaseRepositorio } from './supabaseRepository';

// Punto único donde se elige el almacenamiento: Supabase si hay claves
// configuradas (ver README), o el navegador si no las hay.
export const repositorio: Repositorio = supabase
  ? new SupabaseRepositorio(supabase)
  : new LocalStorageRepositorio();

export const usaBaseDeDatos = supabase !== null;

export type { Repositorio };
