import { useCallback, useEffect, useState } from 'react';
import { repositorio } from '../data';
import type { Laptop, Prestamo } from '../types';

/** Carga laptops y préstamos, y expone `recargar` para refrescar tras cada acción. */
export function useBiblioteca() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);

  const recargar = useCallback(async () => {
    const [l, p] = await Promise.all([
      repositorio.listarLaptops(),
      repositorio.listarPrestamos(),
    ]);
    setLaptops(l.sort((a, b) => a.codigo.localeCompare(b.codigo)));
    setPrestamos(p.sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo)));
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { laptops, prestamos, recargar };
}
