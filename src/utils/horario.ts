import { HORARIO } from '../config/horario';
import { diaALas, diaDe, sumarDias } from './fechas';

const diaDeLaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/**
 * Minutos entre `desde` y `hasta` en que la biblioteca está abierta
 * (de lunes a viernes, de 9:00 a 18:00, hora de Caracas). Nunca negativo.
 */
export function minutosAbiertos(desde: Date, hasta: Date, horario = HORARIO): number {
  if (hasta <= desde) return 0;
  let total = 0;
  const ultimo = diaDe(hasta);
  for (let dia = diaDe(desde); dia <= ultimo; dia = sumarDias(dia, 1)) {
    if (!horario.dias.includes(diaDeLaSemana(dia))) continue;
    const abre = Math.max(diaALas(dia, horario.apertura).getTime(), desde.getTime());
    const cierra = Math.min(diaALas(dia, horario.cierre).getTime(), hasta.getTime());
    if (cierra > abre) total += cierra - abre;
  }
  return Math.floor(total / 60000);
}
