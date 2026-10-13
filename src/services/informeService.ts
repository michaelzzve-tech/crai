import { CUBICULOS, LAPTOPS } from '../config/modulos';
import { CARRERA_POR_INSTITUTO, CONDICIONES, GENEROS, INSTITUTOS, MOTIVOS, SEMESTRES } from '../config/opciones';
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
  desgloseLaptops: Desglose[];
  desgloseCubiculos: Desglose[];
}

/** Una tabla del informe: cantidad y horas agrupadas por un dato (instituto, condición…). */
export interface Desglose {
  titulo: string;
  filas: { etiqueta: string; cantidad: number; minutos: number }[];
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

/** "ITJO · Año 3", "IUJO · Informática", "CFJO · Analista contable". */
function carreraOAnio(r: Registro): string {
  const campo = CARRERA_POR_INSTITUTO[r.instituto];
  const valor = campo?.tipo === 'menu' && campo.opciones.every((o) => /^\d+$/.test(o)) ? `Año ${r.carrera}` : r.carrera;
  return `${r.instituto} · ${valor}`;
}

/** Orden de las filas: primero el de los menús (orden) y luego cualquier otro valor. */
function agrupar(
  titulo: string,
  registros: Registro[],
  clave: (r: Registro) => string,
  minutos: (r: Registro) => number,
  orden: string[] = [],
): Desglose {
  const grupos = new Map<string, { cantidad: number; minutos: number }>();
  for (const r of registros) {
    const g = grupos.get(clave(r)) ?? { cantidad: 0, minutos: 0 };
    g.cantidad += 1;
    g.minutos += minutos(r);
    grupos.set(clave(r), g);
  }
  const posicion = (e: string) => (orden.includes(e) ? orden.indexOf(e) : orden.length);
  const filas = [...grupos.entries()]
    .map(([etiqueta, g]) => ({ etiqueta, ...g }))
    .sort((a, b) => posicion(a.etiqueta) - posicion(b.etiqueta) || a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  return { titulo, filas };
}

/** Orden de "Carrera o año": por instituto y luego por las opciones de su menú. */
const ORDEN_CARRERAS = INSTITUTOS.flatMap((i) => {
  const campo = CARRERA_POR_INSTITUTO[i];
  if (campo?.tipo !== 'menu') return [];
  return campo.opciones.map((o) => carreraOAnio({ instituto: i, carrera: o } as Registro));
});

function desglosar(registros: Registro[], minutos: (r: Registro) => number): Desglose[] {
  return [
    agrupar('Por instituto', registros, (r) => r.instituto, minutos, INSTITUTOS),
    agrupar('Por género', registros, (r) => r.genero || 'Sin dato', minutos, GENEROS),
    agrupar('Por condición', registros, (r) => r.condicion, minutos, CONDICIONES),
    agrupar('Por carrera o año', registros, carreraOAnio, minutos, ORDEN_CARRERAS),
    agrupar('Por semestre o nivel', registros, (r) => r.semestre || 'Sin dato', minutos, SEMESTRES),
    agrupar('Por motivo de uso', registros, (r) => r.motivo, minutos, MOTIVOS),
  ];
}

/** Totales de laptops y cubículos para el período. */
export async function generarInforme(periodo: Periodo): Promise<Informe> {
  const [prestamos, reservas] = await Promise.all([
    repositorio.listarRegistros(LAPTOPS.tablaRegistros),
    repositorio.listarRegistros(CUBICULOS.tablaRegistros),
  ]);
  const p = enPeriodo(prestamos, periodo);
  const r = enPeriodo(reservas, periodo);
  const usoLaptop = (x: Registro) => (x.finReal ? minutosEntre(x.inicio, x.finReal) : 0);
  const reservaCubiculo = (x: Registro) => (x.fin ? minutosEntre(x.inicio, x.fin) : 0);
  const sumar = (lista: Registro[], minutos: (x: Registro) => number) => lista.reduce((t, x) => t + minutos(x), 0);
  return {
    periodo,
    prestamos: p.length,
    prestamosEnCurso: p.filter((x) => !x.finReal).length,
    minutosLaptops: sumar(p, usoLaptop),
    reservas: r.length,
    minutosCubiculos: sumar(r, reservaCubiculo),
    desgloseLaptops: desglosar(p, usoLaptop),
    desgloseCubiculos: desglosar(r, reservaCubiculo),
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

/** Las dos secciones de desglose, iguales en pantalla y en el PDF. */
export function seccionesDesglose(informe: Informe) {
  return [
    { titulo: 'Préstamos de laptops', columnaHoras: 'Horas de uso', desgloses: informe.desgloseLaptops },
    { titulo: 'Reservas de cubículos', columnaHoras: 'Horas reservadas', desgloses: informe.desgloseCubiculos },
  ];
}
