import { CUBICULOS, LAPTOPS } from '../config/modulos';
import { repositorio } from '../data';
import type { Registro } from '../types';
import { diaDe } from '../utils/fechas';

/** Rango de días (en hora de Caracas), ambos incluidos: "2026-10-01" a "2026-10-31". */
export interface Periodo {
  desde: string;
  hasta: string;
}

export interface Informe {
  periodo: Periodo;
  prestamos: number; // Préstamos de laptops que empezaron en el período
  prestamosEnCurso: number; // De esos, los que aún no se devuelven (no suman horas)
  minutosLaptops: number; // Desde la hora de inicio hasta la devolución
  reservas: number; // Reservas de cubículos que empezaron en el período
  minutosCubiculos: number; // Tiempo reservado: de la hora de inicio a la hora de fin
}

/** Del primer día del mes actual a hoy. */
export function periodoDelMes(hoy = new Date()): Periodo {
  const dia = diaDe(hoy);
  return { desde: `${dia.slice(0, 8)}01`, hasta: dia };
}

const minutosEntre = (inicio: string, fin: string) =>
  Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60_000));

function enPeriodo(registros: Registro[], { desde, hasta }: Periodo): Registro[] {
  return registros.filter((r) => {
    const dia = diaDe(r.inicio);
    return dia >= desde && dia <= hasta;
  });
}

/** Totales de laptops y cubículos para el período. */
export async function generarInforme(periodo: Periodo): Promise<Informe> {
  const [prestamos, reservas] = await Promise.all([
    repositorio.listarRegistros(LAPTOPS.tablaRegistros),
    repositorio.listarRegistros(CUBICULOS.tablaRegistros),
  ]);
  const p = enPeriodo(prestamos, periodo);
  const r = enPeriodo(reservas, periodo);
  return {
    periodo,
    prestamos: p.length,
    prestamosEnCurso: p.filter((x) => !x.finReal).length,
    minutosLaptops: p.reduce((total, x) => total + (x.finReal ? minutosEntre(x.inicio, x.finReal) : 0), 0),
    reservas: r.length,
    minutosCubiculos: r.reduce((total, x) => total + (x.fin ? minutosEntre(x.inicio, x.fin) : 0), 0),
  };
}

/** Las filas del informe, iguales en pantalla y en el PDF. */
export function filasInforme(informe: Informe, formatearHoras: (minutos: number) => string) {
  return [
    { titulo: 'Préstamos de laptops', valor: String(informe.prestamos),
      nota: informe.prestamosEnCurso > 0 ? `${informe.prestamosEnCurso} aún sin devolver` : undefined },
    { titulo: 'Horas totales de uso de laptops', valor: formatearHoras(informe.minutosLaptops),
      nota: 'Desde la hora de inicio hasta la devolución' },
    { titulo: 'Reservas de cubículos', valor: String(informe.reservas) },
    { titulo: 'Horas totales de reserva de cubículos', valor: formatearHoras(informe.minutosCubiculos),
      nota: 'De la hora de inicio a la hora de fin de cada reserva' },
  ];
}
