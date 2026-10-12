import { MODULOS } from '../config/modulos';
import { repositorio } from '../data';
import { supabase } from '../data/supabaseClient';
import { EVENTO_CAMBIO } from './registroService';

/** Palabra que se escribe para confirmar cuando no hay base de datos (ni contraseña). */
export const PALABRA_CONFIRMACION = 'BORRAR';

/** true si el borrado se confirma con la contraseña; false si con PALABRA_CONFIRMACION. */
export const confirmaConClave = supabase !== null;

/** Comprueba la contraseña del usuario con sesión iniciada (o la palabra, sin base de datos). */
async function verificar(confirmacion: string): Promise<void> {
  if (!supabase) {
    if (confirmacion.trim().toUpperCase() !== PALABRA_CONFIRMACION) {
      throw new Error(`Escriba ${PALABRA_CONFIRMACION} para confirmar.`);
    }
    return;
  }
  const { data } = await supabase.auth.getSession();
  const correo = data.session?.user.email;
  if (!correo) throw new Error('La sesión expiró. Vuelva a iniciar sesión.');
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: confirmacion });
  if (error) throw new Error(error.status === 400 ? 'Contraseña incorrecta.' : `No se pudo verificar la contraseña (${error.message}).`);
}

/**
 * Borra todos los préstamos y reservas, y deja disponibles las laptops y
 * cubículos que estaban en uso (los de mantenimiento siguen igual).
 * Devuelve cuántos registros se borraron.
 */
export async function borrarTodosLosRegistros(confirmacion: string): Promise<number> {
  await verificar(confirmacion);
  let total = 0;
  for (const modulo of MODULOS) {
    total += (await repositorio.listarRegistros(modulo.tablaRegistros)).length;
    await repositorio.borrarRegistros(modulo.tablaRegistros);
    for (const recurso of await repositorio.listarRecursos(modulo.tablaRecursos)) {
      if (recurso.estado === 'ocupado') {
        await repositorio.guardarRecurso(modulo.tablaRecursos, { ...recurso, estado: 'disponible' });
      }
    }
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
  return total;
}
