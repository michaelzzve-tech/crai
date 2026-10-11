import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Limpia el Project URL tal como suele pegarse: quita espacios, barras finales
 * y "/rest/v1", y agrega "https://" si falta.
 */
export function normalizarUrl(valor: string): string {
  let url = valor.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

const url = normalizarUrl((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '');
const clave = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();

function crearCliente(): { cliente: SupabaseClient | null; error: string } {
  if (!url && !clave) return { cliente: null, error: '' };
  if (!url || !clave) {
    return { cliente: null, error: `Falta el secreto ${url ? 'VITE_SUPABASE_ANON_KEY' : 'VITE_SUPABASE_URL'} en GitHub.` };
  }
  if (url.includes('eyJ')) {
    return { cliente: null, error: 'El secreto VITE_SUPABASE_URL tiene una clave en vez de la dirección. Debe ser el "Project URL" de Supabase, por ejemplo https://abcdefgh.supabase.co' };
  }
  try {
    return { cliente: createClient(url, clave), error: '' };
  } catch {
    return {
      cliente: null,
      error: 'El secreto VITE_SUPABASE_URL no es una dirección válida. Debe ser el "Project URL" de Supabase, por ejemplo https://abcdefgh.supabase.co',
    };
  }
}

const { cliente, error } = crearCliente();

/**
 * Cliente de Supabase, o `null` si no se configuraron las claves.
 * Sin claves la app sigue funcionando y guarda los datos en el navegador.
 */
export const supabase: SupabaseClient | null = cliente;

/** Mensaje si las claves están mal configuradas; vacío si todo está bien. */
export const errorConfiguracion = error;
