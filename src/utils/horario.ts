import { HORARIO } from '../config/horario';
import { diaALas, diaDe } from './fechas';

const diaDeLaSemana = (dia: string) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/**
 * Minutos que un espacio sigue libre hoy: desde ahora (o desde la apertura, si aún no abre)
 * hasta su próxima reserva o hasta el cierre, lo que llegue primero. Las horas libres no se
 * suman de un día a otro: vencen al cierre (6 p. m.) y se renuevan al abrir (9 a. m.).
 * `null` si la biblioteca ya cerró hoy o hoy no abre (sábado y domingo).
 */
export function minutosLibresHoy(ahora: Date, reserva: Date, horario = HORARIO): number | null {
  const hoy = diaDe(ahora);
  const cierre = diaALas(hoy, horario.cierre);
  if (!horario.dias.includes(diaDeLaSemana(hoy)) || ahora >= cierre) return null;
  const desde = Math.max(ahora.getTime(), diaALas(hoy, horario.apertura).getTime());
  const hasta = Math.min(reserva.getTime(), cierre.getTime());
  return Math.max(0, Math.floor((hasta - desde) / 60000));
}

/** La hora de cierre de hoy, como fecha ISO (para mostrarla con formatearHora). */
export const cierreDeHoy = (ahora: Date, horario = HORARIO) => diaALas(diaDe(ahora), horario.cierre).toISOString();
