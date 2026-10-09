const formato = new Intl.DateTimeFormat('es', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatearFecha(iso?: string): string {
  return iso ? formato.format(new Date(iso)) : '—';
}

export function sumarHoras(fecha: Date, horas: number): Date {
  return new Date(fecha.getTime() + horas * 60 * 60 * 1000);
}
