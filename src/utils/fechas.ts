const formatoFecha = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' });
const formatoHora = new Intl.DateTimeFormat('es', { timeStyle: 'short' });

export function formatearFecha(iso?: string): string {
  return iso ? formatoFecha.format(new Date(iso)) : '—';
}

export function formatearHora(iso?: string): string {
  return iso ? formatoHora.format(new Date(iso)) : '—';
}

/** Hora actual como "HH:MM", para el valor inicial de un campo de hora. */
export function horaActual(fecha = new Date()): string {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** Fecha de hoy a la hora indicada ("HH:MM"). */
export function hoyALas(hora: string, hoy = new Date()): Date {
  const [h, m] = hora.split(':').map(Number);
  const fecha = new Date(hoy);
  fecha.setHours(h, m, 0, 0);
  return fecha;
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

/** Duración entre dos fechas ISO. */
export function duracionEntreFechas(inicio: string, fin: string): string {
  return formatearDuracion(Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000));
}
