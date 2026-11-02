import { useEffect, useState } from 'react';

/** true mientras el navegador tiene conexión a internet; cambia solo al perderla o recuperarla. */
export function useConexion(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const conectado = () => setEnLinea(true);
    const desconectado = () => setEnLinea(false);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);
  return enLinea;
}
