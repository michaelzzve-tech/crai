/**
 * Horario de la biblioteca (hora de Caracas). Se usa para contar el tiempo libre de un
 * espacio hasta su próxima reserva: solo cuentan las horas en que la biblioteca está abierta.
 */
export const HORARIO = {
  apertura: '09:00',
  cierre: '18:00',
  /** Días abiertos: 1 = lunes … 5 = viernes (0 = domingo, 6 = sábado). */
  dias: [1, 2, 3, 4, 5],
};
