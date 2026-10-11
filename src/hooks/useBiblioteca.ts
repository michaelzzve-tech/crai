import { useCallback, useEffect, useState } from 'react';
import { repositorio } from '../data';
import { asegurarLaptops } from '../services/prestamoService';
import type { Laptop, Prestamo } from '../types';

/** Carga laptops y préstamos, y expone `recargar` para refrescar tras cada acción. */
export function useBiblioteca() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    const [l, p] = await Promise.all([
      repositorio.listarLaptops(),
      repositorio.listarPrestamos(),
    ]);
    setLaptops(l.sort((a, b) => a.numero - b.numero));
    setPrestamos(p.sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo)));
  }, []);

  useEffect(() => {
    asegurarLaptops()
      .then(recargar)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [recargar]);

  return { laptops, prestamos, recargar, error };
}
