// Todas las horas se muestran y se interpretan en hora de Caracas, Venezuela,
// sin importar la zona horaria configurada en la computadora del mostrador.
// Venezuela usa UTC−4 todo el año (no cambia de horario).
export const ZONA_HORARIA = 'America/Caracas';
const DESFASE_CARACAS = '-04:00';

const formatoFecha = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', timeZone: ZONA_HORARIA });
const formatoHora = new Intl.DateTimeFormat('es', { timeStyle: 'short', timeZone: ZONA_HORARIA });
const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }); // "2026-10-11"
const formatoHHMM = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA_HORARIA });

export function formatearFecha(iso?: string): string {
  return iso ? formatoFecha.format(new Date(iso)) : '—';
}

export function formatearHora(iso?: string): string {
  return iso ? formatoHora.format(new Date(iso)) : '—';
}

/** Hora actual de Caracas como "HH:MM", para el valor inicial de un campo de hora. */
export function horaActual(fecha = new Date()): string {
  return formatoHHMM.format(fecha);
}

/** Fecha de hoy (en Caracas) a la hora de Caracas indicada ("HH:MM"). */
export function hoyALas(hora: string, hoy = new Date()): Date {
  return new Date(`${formatoDia.format(hoy)}T${hora}:00${DESFASE_CARACAS}`);
}

/** Texto como "2 h 30 min" para los minutos dados. */
export function formatearDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Duración entre dos horas "HH:MM" del mismo día, o '' si no es válida. */
export function duracionEntreHoras(inicio: string, fin: string): string {
  if (!inicio || !fin) return '';
  const minutos = Math.round((hoyALas(fin).getTime() - hoyALas(inicio).getTime()) / 60000);
  return minutos > 0 ? formatearDuracion(minutos) : '';
}

/** Duración entre dos fechas (ISO o Date); nunca negativa. */
export function duracionEntreFechas(inicio: string | Date, fin: string | Date): string {
  const minutos = Math.floor((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  return formatearDuracion(Math.max(0, minutos));
}
