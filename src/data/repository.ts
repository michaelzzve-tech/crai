import type { Recurso, Registro, ReservaSala } from '../types';

/**
 * Contrato de acceso a datos. Cada método recibe el nombre de la tabla del
 * módulo (por ejemplo "laptops" y "prestamos", o "cubiculos" y "reservas").
 * La interfaz usa promesas para que se pueda reemplazar el almacenamiento
 * (navegador, Supabase u otro) sin tocar los componentes ni los servicios.
 */
export interface Repositorio {
  listarRecursos(tabla: string): Promise<Recurso[]>;
  guardarRecurso(tabla: string, recurso: Recurso): Promise<void>;

  listarRegistros(tabla: string): Promise<Registro[]>;
  guardarRegistro(tabla: string, registro: Registro): Promise<void>;
  /** Borra un registro (por ejemplo, una reserva programada que se cancela). */
  borrarRegistro(tabla: string, id: string): Promise<void>;
  /** Borra todos los registros de la tabla. No se puede deshacer. */
  borrarRegistros(tabla: string): Promise<void>;

  /** Reservas de las salas especiales (tabla "reservas_salas"). */
  listarReservasSalas(): Promise<ReservaSala[]>;
  guardarReservaSala(reserva: ReservaSala): Promise<void>;
  borrarReservaSala(id: string): Promise<void>;
}
