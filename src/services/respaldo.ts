import { CUBICULOS, LAPTOPS, nombreRecurso, type Modulo } from '../config/modulos';
import { repositorio } from '../data';
import type { Registro } from '../types';
import { diaDe, diferenciaConPrevisto, duracionEntreFechas, formatearDia, formatearHora } from '../utils/fechas';

export interface Columna {
  titulo: string;
  ancho: number;
  valor: (r: Registro) => string;
}

const fecha = (iso?: string) => (iso ? formatearDia(diaDe(iso)) : '');
const hora = (iso?: string) => (iso ? formatearHora(iso) : '');
/** Hora de devolución o salida; si fue otro día que el inicio, también la fecha. */
const horaFinal = (r: Registro) =>
  !r.finReal ? '' : diaDe(r.finReal) === diaDe(r.inicio) ? hora(r.finReal) : `${fecha(r.finReal)} ${hora(r.finReal)}`;

/** Datos de cada registro, en el orden del formulario (en el Excel y en el detalle del PDF). */
export function columnasDetalle(modulo: Modulo): Columna[] {
  const comunes: Columna[] = [
    { titulo: modulo.recurso, ancho: 10, valor: (r) => nombreRecurso(r.recursoId) },
    { titulo: 'Nombre', ancho: 28, valor: (r) => r.nombre },
    { titulo: 'Género', ancho: 12, valor: (r) => r.genero ?? '' },
    { titulo: 'Instituto', ancho: 10, valor: (r) => r.instituto },
    { titulo: 'Condición', ancho: 12, valor: (r) => r.condicion },
    { titulo: 'Carrera o año', ancho: 16, valor: (r) => r.carrera },
    { titulo: 'Semestre, nivel o sección', ancho: 16, valor: (r) => r.semestre ?? '' },
    ...(modulo.conUsuarios ? [{ titulo: 'Cantidad de usuarios', ancho: 12, valor: (r: Registro) => (r.usuarios ? String(r.usuarios) : '') }] : []),
    { titulo: 'Motivo de uso', ancho: 16, valor: (r) => r.motivo },
    { titulo: 'Fecha', ancho: 12, valor: (r) => fecha(r.inicio) },
    { titulo: 'Hora de inicio', ancho: 14, valor: (r) => hora(r.inicio) },
  ];
  const finales: Columna[] = modulo.conHoraFin
    ? [
        { titulo: 'Hora de fin', ancho: 14, valor: (r) => hora(r.fin) },
        { titulo: 'Duración', ancho: 14, valor: (r) => (r.fin ? duracionEntreFechas(r.inicio, r.fin) : '') },
        { titulo: 'Hora de salida', ancho: 14, valor: horaFinal },
        { titulo: 'Tiempo real de uso', ancho: 16, valor: (r) => (r.finReal ? duracionEntreFechas(r.inicio, r.finReal) : '') },
        { titulo: 'Diferencia con lo previsto', ancho: 26, valor: (r) => (r.finReal && r.fin ? diferenciaConPrevisto(r.fin, r.finReal) : '') },
      ]
    : [
        { titulo: 'Hora de devolución', ancho: 18, valor: horaFinal },
        { titulo: 'Tiempo transcurrido', ancho: 18, valor: (r) => (r.finReal ? duracionEntreFechas(r.inicio, r.finReal) : 'Sin devolver') },
      ];
  return [...comunes, ...finales];
}

/** Columnas de cada hoja del Excel: el detalle y el código interno. */
const columnas = (modulo: Modulo): Columna[] =>
  [...columnasDetalle(modulo), { titulo: 'Código interno', ancho: 26, valor: (r) => r.id }];

/** Período del respaldo: todo, un año completo o un mes de un año (mes 1–12). */
export interface PeriodoRespaldo {
  anio?: number;
  mes?: number;
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "2026", "2026-10" o '' (todo), comparable con el inicio de diaDe(). */
function prefijo({ anio, mes }: PeriodoRespaldo): string {
  if (!anio) return '';
  return mes ? `${anio}-${String(mes).padStart(2, '0')}` : String(anio);
}

/**
 * Descarga un Excel con los préstamos de laptops y las reservas de cubículos
 * (una hoja para cada uno) del período elegido; sin período, trae todo.
 * Los registros cuentan por la fecha de inicio, en hora de Caracas.
 * La librería se carga solo al pedirlo.
 */
export async function descargarRespaldo(periodo: PeriodoRespaldo = {}): Promise<number> {
  const [{ default: ExcelJS }, todosPrestamos, todasReservas] = await Promise.all([
    import('exceljs'),
    repositorio.listarRegistros(LAPTOPS.tablaRegistros),
    repositorio.listarRegistros(CUBICULOS.tablaRegistros),
  ]);
  const filtro = prefijo(periodo);
  const delPeriodo = (r: Registro) => diaDe(r.inicio).startsWith(filtro);
  const prestamos = todosPrestamos.filter(delPeriodo);
  const reservas = todasReservas.filter(delPeriodo);

  const libro = new ExcelJS.Workbook();
  libro.created = new Date();
  for (const [modulo, registros] of [[LAPTOPS, prestamos], [CUBICULOS, reservas]] as const) {
    const cols = columnas(modulo);
    const hoja = libro.addWorksheet(modulo.registros, { views: [{ state: 'frozen', ySplit: 1 }] });
    hoja.columns = cols.map((c) => ({ header: c.titulo, width: c.ancho }));
    hoja.getRow(1).font = { bold: true };
    const ordenados = [...registros].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (const r of ordenados) hoja.addRow(cols.map((c) => c.valor(r)));
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  }

  const datos = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([datos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `respaldo-crai-${filtro || `completo-${diaDe()}`}.xlsx`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return prestamos.length + reservas.length;
}
