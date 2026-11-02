import type { Registro } from '../types';

/**
 * Orden de todas las listas de préstamos y reservas: las últimas en registrarse primero.
 * Las anteriores a guardar la hora de registro van después, por su fecha de registro y luego
 * por su fecha de inicio (la más reciente primero). Las de una misma serie recurrente
 * (registradas a la vez) quedan juntas, por fecha de la reserva.
 */
export function masRecientesPrimero(a: Registro, b: Registro): number {
  return (b.creado ?? '').localeCompare(a.creado ?? '')
    || (b.fechaRegistro ?? '').localeCompare(a.fechaRegistro ?? '')
    || (a.creado ? a.inicio.localeCompare(b.inicio) : b.inicio.localeCompare(a.inicio));
}
