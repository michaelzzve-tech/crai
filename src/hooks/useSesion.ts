import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../data/supabaseClient';

/**
 * Sesión del bibliotecario en Supabase. Sin base de datos configurada no
 * hace falta iniciar sesión y `requiereLogin` es false.
 */
export function useSesion() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  const cerrarSesion = async () => {
    await supabase?.auth.signOut();
  };

  return {
    requiereLogin: supabase !== null && sesion === null,
    cargando,
    correo: sesion?.user.email,
    cerrarSesion: supabase ? cerrarSesion : undefined,
  };
}
