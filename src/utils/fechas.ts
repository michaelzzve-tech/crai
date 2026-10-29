// Todas las horas se muestran y se interpretan en hora de Caracas, Venezuela,
// sin importar la zona horaria configurada en la computadora del mostrador.
// Venezuela usa UTC−4 todo el año (no cambia de horario).
export const ZONA_HORARIA = 'America/Caracas';
const DESFASE_CARACAS = '-04:00';

// Horas en formato de 12 horas: "3:47 p. m.".
const formatoFecha = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short', hour12: true, timeZone: ZONA_HORARIA });
const formatoHora = new Intl.DateTimeFormat('es', { timeStyle: 'short', hour12: true, timeZone: ZONA_HORARIA });
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

/** Día en Caracas ("2026-10-11") de una fecha. */
export function diaDe(fecha: string | Date = new Date()): string {
  return formatoDia.format(new Date(fecha));
}

/** "11/10/2026" a partir de "2026-10-11". */
export function formatearDia(dia: string): string {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}

/** Fecha de hoy (en Caracas) a la hora de Caracas indicada ("HH:MM"). */
export function hoyALas(hora: string, hoy = new Date()): Date {
  return diaALas(formatoDia.format(hoy), hora);
}

/** El día indicado ("2026-10-14") a la hora de Caracas indicada ("HH:MM"). */
export function diaALas(dia: string, hora: string): Date {
  return new Date(`${dia}T${hora}:00${DESFASE_CARACAS}`);
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
/** "12 min antes de lo previsto", "1 h 5 min después de lo previsto" o "a la hora prevista". */
export function diferenciaConPrevisto(previsto: string, real: string): string {
  const minutos = Math.round((new Date(real).getTime() - new Date(previsto).getTime()) / 60000);
  if (minutos === 0) return 'a la hora prevista';
  return `${formatearDuracion(Math.abs(minutos))} ${minutos < 0 ? 'antes' : 'después'} de lo previsto`;
}

export function duracionEntreFechas(inicio: string | Date, fin: string | Date): string {
  const minutos = Math.floor((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  return formatearDuracion(Math.max(0, minutos));
}

// Días como texto "AAAA-MM-DD" (sin hora), para recorrer el calendario por semanas.
const aMediodia = (dia: string) => new Date(`${dia}T12:00:00Z`);
const textoDia = (fecha: Date) => fecha.toISOString().slice(0, 10);

/** El día `n` días después (o antes, si es negativo) de `dia`. */
export function sumarDias(dia: string, n: number): string {
  const fecha = aMediodia(dia);
  fecha.setUTCDate(fecha.getUTCDate() + n);
  return textoDia(fecha);
}

/** Lunes de la semana de `dia`. */
export function lunesDe(dia: string): string {
  const semana = aMediodia(dia).getUTCDay(); // 0 = domingo
  return sumarDias(dia, semana === 0 ? -6 : 1 - semana);
}

const formatoDiaCorto = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const formatoDiaLargo = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatoMesCorto = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "lun 27" */
export const formatearDiaCorto = (dia: string) => formatoDiaCorto.format(aMediodia(dia)).replace(',', '');
/** "lunes, 27 de octubre de 2026" */
export const formatearDiaLargo = (dia: string) => formatoDiaLargo.format(aMediodia(dia));
/** "27 oct – 2 nov 2026" */
export function formatearSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  return `${formatoMesCorto.format(aMediodia(lunes))} – ${formatoMesCorto.format(aMediodia(domingo))} ${domingo.slice(0, 4)}`;
}

/** Minutos desde la medianoche (hora de Caracas) de una fecha ISO. */
export function minutosDelDia(iso: string): number {
  const [h, m] = horaActual(new Date(iso)).split(':').map(Number);
  return h * 60 + m;
}
