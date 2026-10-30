import { sumarDias } from '../utils/fechas';

/**
 * Reservas recurrentes (salas especiales y cubículos): la misma reserva en los días
 * de la semana elegidos, entre una fecha y otra.
 */

/** Días de la semana que se pueden repetir: 1 = lunes … 6 = sábado. */
export const DIAS_RECURRENCIA = [
  { numero: 1, corto: 'Lun', largo: 'lunes' },
  { numero: 2, corto: 'Mar', largo: 'martes' },
  { numero: 3, corto: 'Mié', largo: 'miércoles' },
  { numero: 4, corto: 'Jue', largo: 'jueves' },
  { numero: 5, corto: 'Vie', largo: 'viernes' },
  { numero: 6, corto: 'Sáb', largo: 'sábado' },
];

/** Días de la semana (1 = lunes … 6 = sábado) y última fecha de una reserva recurrente. */
export interface Recurrencia {
  dias: number[];
  hasta: string; // "AAAA-MM-DD"
}

/** Máximo de fechas de una serie, para no crear cientos por error. */
const MAXIMO_SERIE = 200;

/** Día de la semana de "AAAA-MM-DD": 0 = domingo … 6 = sábado. */
export const diaDeLaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/** Fechas entre `desde` y `hasta` (inclusive) que caen en los días de la semana elegidos. */
export function fechasDeSerie(desde: string, hasta: string, dias: number[]): string[] {
  const fechas: string[] = [];
  if (!desde || !hasta || desde > hasta) return fechas;
  for (let f = desde; f <= hasta && fechas.length <= MAXIMO_SERIE; f = sumarDias(f, 1)) {
    if (dias.includes(diaDeLaSemana(f))) fechas.push(f);
  }
  return fechas;
}

/** Fechas de una serie de `desde` a `recurrencia.hasta`; falla con un mensaje claro si no hay ninguna o son demasiadas. */
export function validarSerie(desde: string, { dias, hasta }: Recurrencia): string[] {
  if (!dias.length) throw new Error('Elija al menos un día de la semana para repetir la reserva.');
  if (!hasta) throw new Error('Indique hasta qué día es válida la reserva recurrente.');
  if (hasta < desde) throw new Error('La fecha "Válida hasta" debe ser igual o posterior a "Válida desde".');
  const fechas = fechasDeSerie(desde, hasta, dias);
  if (!fechas.length) throw new Error('No hay ningún día elegido entre esas fechas.');
  if (fechas.length > MAXIMO_SERIE) throw new Error(`Son más de ${MAXIMO_SERIE} fechas; acorte el período.`);
  return fechas;
}

/** "lunes y miércoles", "lunes, miércoles y viernes". */
export function nombresDeDias(dias: number[]): string {
  const nombres = DIAS_RECURRENCIA.filter((d) => dias.includes(d.numero)).map((d) => d.largo);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0] ?? '';
}

/** Recurrencia propuesta al activar la casilla: el día de la semana de la fecha elegida, durante cuatro semanas. */
export function recurrenciaInicial(fecha: string): Recurrencia {
  const dia = diaDeLaSemana(fecha);
  return { dias: dia >= 1 && dia <= 6 ? [dia] : [], hasta: sumarDias(fecha, 27) };
}
