import { useEffect, useRef } from 'react';
import { repositorio } from '../data';

/** Espera tras un aviso antes de recargar, para juntar varios cambios seguidos (por ejemplo, una reserva recurrente). */
const ESPERA_MS = 400;

/**
 * Vuelve a cargar los datos en cuanto otra cuenta cambia alguna de estas tablas, para que
 * el planner se vea igual en todas las computadoras. También recarga al volver a la
 * pestaña, por si se perdió algún aviso mientras estaba en segundo plano.
 */
export function useCambiosEnVivo(tablas: string[], recargar: () => Promise<void> | void) {
  const ultimaRecarga = useRef(recargar);
  useEffect(() => { ultimaRecarga.current = recargar; }, [recargar]);
  const clave = tablas.join(',');

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined;
    const pedirRecarga = () => {
      clearTimeout(espera);
      espera = setTimeout(() => { void Promise.resolve(ultimaRecarga.current()).catch(() => {}); }, ESPERA_MS);
    };
    const dejarDeEscuchar = repositorio.escucharCambios(clave.split(','), pedirRecarga);
    const alVolver = () => { if (document.visibilityState === 'visible') pedirRecarga(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearTimeout(espera);
      dejarDeEscuchar();
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [clave]);
}
