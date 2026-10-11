import { useEffect, useState } from 'react';

/** La hora actual, actualizada cada `intervaloMs` (para tiempos que corren en pantalla). */
export function useAhora(intervaloMs = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
