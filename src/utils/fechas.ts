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
