import { useEffect, useState } from 'react';

/** La hora actual, actualizada cada `intervaloMs` (para tiempos que corren en pantalla). */
export function useAhora(intervaloMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const actualizar = () => setAhora(new Date());
    const id = setInterval(actualizar, intervaloMs);
    // Evita mostrar un mantenimiento activo con la hora anterior al terminarlo.
    window.addEventListener('biblioteca:cambio', actualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener('biblioteca:cambio', actualizar);
    };
  }, [intervaloMs]);
  return ahora;
}
