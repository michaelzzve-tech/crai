import type { Laptop, Prestamo } from '../types';

/**
 * Contrato de acceso a datos. La interfaz usa promesas para que se pueda
 * reemplazar el almacenamiento (navegador, Supabase u otro) sin tocar los
 * componentes ni los servicios.
 */
export interface Repositorio {
  listarLaptops(): Promise<Laptop[]>;
  guardarLaptop(laptop: Laptop): Promise<void>;

  listarPrestamos(): Promise<Prestamo[]>;
  guardarPrestamo(prestamo: Prestamo): Promise<void>;
}
