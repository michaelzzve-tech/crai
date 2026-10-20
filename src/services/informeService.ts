import { CUBICULOS, LAPTOPS } from '../config/modulos';
import { CARRERA_POR_INSTITUTO, CONDICIONES_LAPTOPS } from '../config/opciones';
import { repositorio } from '../data';
import type { Registro } from '../types';
import { diaDe, formatearDia } from '../utils/fechas';

// Informe con el formato del reporte mensual del CRAI: beneficiarios por servicio
// (con el detalle por institución y condición) y cuadros comparativos mes a mes.

/** Rango de días (en hora de Caracas), ambos incluidos: "2026-10-01" a "2026-10-31". */
export interface Periodo {
  desde: string;
  hasta: string;
}

/** "Administración (38)", "estudio (78)". */
export interface Conteo {
  etiqueta: string;
  cantidad: number;
}

/** Estudiantes, Docentes… de una institución. */
export interface Grupo {
  titulo: string;
  cantidad: number;
  usuarias: number;
  usuarios: number;
  cursantes: Conteo[];
  motivos: Conteo[];
  usuariosCubiculos?: number; // Solo cubículos: suma de "Cantidad de usuarios"
  minutos: number;
}

export interface BloqueInstitucion {
  nombre: string;
  cantidad: number;
  usuarias: number;
  usuarios: number;
  usuariosCubiculos?: number;
  minutos: number;
  grupos: Grupo[];
}

/** "Cubículos de Estudio" o "Préstamos de Laptops", como en la sección 3 del reporte. */
export interface Servicio {
  titulo: string;
  unidad: string; // "reservas" o "solicitudes"
  totales: { etiqueta: string; valor: string }[];
  instituciones: BloqueInstitucion[];
}

/** Un cuadro comparativo: una fila por género o institución y una columna por mes. */
export interface Cuadro {
  titulo: string; // "Reservas de CUBÍCULOS DE ESTUDIO"
  grafica: string; // Título de su gráfica
  columna: string; // "GÉNERO" o "INSTITUCIÓN"
  meses: string[]; // "sep-25", "oct-25"…
  filas: { etiqueta: string; valores: number[] }[];
  horas: boolean; // true: los valores son minutos y se muestran como "H:MM"
}

export interface SeccionCuadros {
  titulo: string; // "POR GÉNERO"
  cuadros: Cuadro[];
}

export interface Informe {
  periodo: Periodo;
  titulo: string; // "SEPTIEMBRE, 2026" o "01/09/2026 al 15/09/2026"
  servicios: Servicio[];
  comparativos: SeccionCuadros[];
  detallePrestamos: Registro[]; // Cada préstamo del período, del más antiguo al más reciente
  detalleReservas: Registro[]; // Cada reserva del período, igual
}

/** Colores de las líneas de las gráficas, siempre en este orden (validados para daltonismo). */
export const COLORES_SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

/** Cuántos meses muestran los cuadros comparativos (hasta el mes del período). */
const MESES_COMPARATIVOS = 13;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

/** Nombre de cada condición en plural, en el orden del reporte. */
const GRUPOS: Record<string, string> = {
  Estudiante: 'Estudiantes',
  Docente: 'Docentes',
  Psicólogo: 'Psicólogos',
  DTI: 'DTI',
  Otro: 'Otros',
};

const INSTITUCIONES = ['ITJO', 'IUJO', 'CFJO'];
const GENEROS = ['Femenino', 'Masculino', 'No aplica']; // Orden de los cuadros del reporte
const OTROS = 'OTROS';
const OTROS_DTI = 'OTROS (DTI)';

/** Del primer día del mes actual a hoy. */
export function periodoDelMes(hoy = new Date()): Periodo {
  const dia = diaDe(hoy);
  return { desde: `${dia.slice(0, 8)}01`, hasta: dia };
}

/** Un mes completo: "2026-09" → del 01/09 al 30/09. */
export function periodoDeMes(mes: string): Periodo {
  const [a, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** 7 → "07", como los números del reporte. */
export const dosCifras = (n: number) => String(n).padStart(2, '0');

/** 498 → "08 horas, 18 minutos". */
export const horasYMinutos = (minutos: number) =>
  `${dosCifras(Math.floor(minutos / 60))} horas, ${dosCifras(minutos % 60)} minutos`;

/** 498 → "8:18", para los cuadros. */
export const horasCortas = (minutos: number) => `${Math.floor(minutos / 60)}:${dosCifras(minutos % 60)}`;

const minutosEntre = (inicio: string, fin: string) =>
  Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60_000));

/** Laptops: de la hora de inicio a la devolución (0 si aún no se devuelve). */
const usoLaptop = (r: Registro) => (r.finReal ? minutosEntre(r.inicio, r.finReal) : 0);
/** Cubículos: hasta la salida real; si sigue activa, hasta la hora de fin. */
const usoCubiculo = (r: Registro) => {
  const fin = r.finReal ?? r.fin;
  return fin ? minutosEntre(r.inicio, fin) : 0;
};

function enPeriodo(registros: Registro[], { desde, hasta }: Periodo): Registro[] {
  return registros.filter((r) => {
    const dia = diaDe(r.inicio);
    return dia >= desde && dia <= hasta;
  });
}

/** DTI va aparte, como en el reporte; la institución "Otro" se agrupa en OTROS. */
const institucionDe = (r: Registro) => (r.condicion === 'DTI' ? OTROS_DTI : r.instituto === 'Otro' ? OTROS : r.instituto);

/** "Año 3" para ITJO; la carrera para los demás; nada si no aplica. */
function cursante(r: Registro): string {
  if (!r.carrera || r.carrera === 'No aplica') return '';
  const campo = CARRERA_POR_INSTITUTO[r.instituto];
  return campo?.tipo === 'menu' && campo.opciones.every((o) => /^\d+$/.test(o)) ? `Año ${r.carrera}` : r.carrera;
}

function contar(registros: Registro[], clave: (r: Registro) => string): Conteo[] {
  const conteo = new Map<string, number>();
  for (const r of registros) {
    const k = clave(r);
    if (k) conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
}

const sumar = (registros: Registro[], valor: (r: Registro) => number) => registros.reduce((t, r) => t + valor(r), 0);
const deGenero = (registros: Registro[], genero: string) => registros.filter((r) => r.genero === genero).length;

function servicio(
  titulo: string,
  unidad: string,
  registros: Registro[],
  minutos: (r: Registro) => number,
  conUsuarios: boolean,
): Servicio {
  const usuariosCubiculos = (lista: Registro[]) => (conUsuarios ? sumar(lista, (r) => r.usuarios ?? 0) : undefined);
  const porCondicion = (c: string) => registros.filter((r) => r.condicion === c).length;
  const total = sumar(registros, minutos);
  const Unidad = unidad[0].toUpperCase() + unidad.slice(1);

  const totales = conUsuarios
    ? [
        { etiqueta: `Total de ${unidad} realizadas`, valor: dosCifras(registros.length) },
        { etiqueta: 'Total de usuarios en cubículos', valor: dosCifras(usuariosCubiculos(registros) ?? 0) },
        { etiqueta: `Total de ${unidad} por estudiantes`, valor: dosCifras(porCondicion('Estudiante')) },
        { etiqueta: `Total de ${unidad} por docentes`, valor: dosCifras(porCondicion('Docente')) },
      ]
    : [
        { etiqueta: `Total ${unidad} realizadas`, valor: dosCifras(registros.length) },
        { etiqueta: `${Unidad} por estudiantes`, valor: dosCifras(porCondicion('Estudiante')) },
        { etiqueta: `${Unidad} por docentes`, valor: dosCifras(porCondicion('Docente')) },
      ];
  totales.push(
    { etiqueta: `${conUsuarios ? `Total de ${unidad}` : Unidad} por otros`,
      valor: dosCifras(registros.length - porCondicion('Estudiante') - porCondicion('Docente')) },
    { etiqueta: 'Total de usuarias', valor: dosCifras(deGenero(registros, 'Femenino')) },
    { etiqueta: 'Total de usuarios', valor: dosCifras(deGenero(registros, 'Masculino')) },
    // Género "No aplica": solo aparece si hay alguno, para que los totales cuadren.
    ...(deGenero(registros, 'No aplica') > 0
      ? [{ etiqueta: 'Género no aplica', valor: dosCifras(deGenero(registros, 'No aplica')) }]
      : []),
    { etiqueta: conUsuarios ? 'Tiempo total de uso general' : 'Tiempo total de horas de uso',
      valor: `${Math.floor(total / 60)} horas con ${dosCifras(total % 60)} minutos` },
  );

  const presentes = new Set(registros.map(institucionDe));
  const nombres = [...INSTITUCIONES, ...[OTROS, OTROS_DTI].filter((n) => presentes.has(n)),
    ...[...presentes].filter((n) => ![...INSTITUCIONES, OTROS, OTROS_DTI].includes(n))];
  const instituciones = nombres.map((nombre): BloqueInstitucion => {
    const lista = registros.filter((r) => institucionDe(r) === nombre);
    // En OTROS (DTI) todos son de DTI: no hace falta separarlos por condición.
    const condiciones = nombre === OTROS_DTI ? [] : [...CONDICIONES_LAPTOPS, ...new Set(lista.map((r) => r.condicion))];
    const grupos = [...new Set(condiciones)]
      .map((c) => ({ c, deCondicion: lista.filter((r) => r.condicion === c) }))
      .filter(({ deCondicion }) => deCondicion.length > 0)
      .map(({ c, deCondicion }) => ({
        titulo: GRUPOS[c] ?? c,
        cantidad: deCondicion.length,
        usuarias: deGenero(deCondicion, 'Femenino'),
        usuarios: deGenero(deCondicion, 'Masculino'),
        cursantes: contar(deCondicion, cursante),
        motivos: contar(deCondicion, (r) => r.motivo),
        usuariosCubiculos: usuariosCubiculos(deCondicion),
        minutos: sumar(deCondicion, minutos),
      }));
    return {
      nombre,
      cantidad: lista.length,
      usuarias: deGenero(lista, 'Femenino'),
      usuarios: deGenero(lista, 'Masculino'),
      usuariosCubiculos: usuariosCubiculos(lista),
      minutos: sumar(lista, minutos),
      grupos,
    };
  });

  return { titulo, unidad, totales, instituciones };
}

/** Los meses de los cuadros: "2025-09"… "2026-09". */
function mesesHasta(hasta: string): string[] {
  const [a, m] = hasta.split('-').map(Number);
  return Array.from({ length: MESES_COMPARATIVOS }, (_, i) => {
    const total = a * 12 + (m - 1) - (MESES_COMPARATIVOS - 1 - i);
    return `${Math.floor(total / 12)}-${dosCifras((total % 12) + 1)}`;
  });
}

/** "2025-09" → "sep-25". */
const etiquetaMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}-${mes.slice(2, 4)}`;

function cuadro(
  titulo: string,
  grafica: string,
  columna: string,
  meses: string[],
  registros: Registro[],
  filas: string[],
  claveFila: (r: Registro) => string,
  valor: (r: Registro) => number = () => 1,
  horas = false,
): Cuadro {
  const valores = filas.map(() => meses.map(() => 0));
  for (const r of registros) {
    const fila = filas.indexOf(claveFila(r));
    const mes = meses.indexOf(diaDe(r.inicio).slice(0, 7));
    if (fila >= 0 && mes >= 0) valores[fila][mes] += valor(r);
  }
  return {
    titulo, grafica, columna, horas,
    meses: meses.map(etiquetaMes),
    filas: filas.map((etiqueta, i) => ({ etiqueta, valores: valores[i] })),
  };
}

function comparativos(prestamos: Registro[], reservas: Registro[], hasta: string): SeccionCuadros[] {
  const meses = mesesHasta(hasta);
  const institucion = (r: Registro) => (INSTITUCIONES.includes(r.instituto) && r.condicion !== 'DTI' ? r.instituto : OTROS);
  const filasInstitucion = [...INSTITUCIONES, OTROS];
  return [
    {
      titulo: 'POR GÉNERO',
      cuadros: [
        cuadro('Reservas de CUBÍCULOS DE ESTUDIO', 'Reservas de cubículos de estudio por género', 'GÉNERO', meses, reservas, GENEROS, (r) => r.genero ?? ''),
        cuadro('Solicitudes de LAPTOPS', 'Solicitud de laptops por género', 'GÉNERO', meses, prestamos, GENEROS, (r) => r.genero ?? ''),
      ],
    },
    {
      titulo: 'POR INSTITUCIÓN',
      cuadros: [
        cuadro('Reservas de CUBÍCULOS DE ESTUDIO', 'Reserva de cubículos de estudio por institución', 'INSTITUCIÓN', meses, reservas, filasInstitucion, institucion),
        cuadro('Solicitudes de LAPTOPS', 'Solicitud de laptops por institución', 'INSTITUCIÓN', meses, prestamos, filasInstitucion, institucion),
      ],
    },
    {
      titulo: 'TOTAL USUARIOS DE CUBÍCULOS DE ESTUDIO',
      cuadros: [
        cuadro('Usuarios en CUBÍCULOS DE ESTUDIO', 'Usuarios de cubículos de estudio por institución', 'INSTITUCIÓN', meses, reservas,
          filasInstitucion, institucion, (r) => r.usuarios ?? 0),
      ],
    },
    {
      titulo: 'HORAS DE USO DE CUBÍCULOS DE ESTUDIO',
      cuadros: [
        cuadro('Horas de uso CUBÍCULOS DE ESTUDIO', 'Horas de uso de cubículos de estudio', 'INSTITUCIÓN', meses, reservas,
          filasInstitucion, institucion, usoCubiculo, true),
      ],
    },
    {
      titulo: 'HORAS DE USO DE LAPTOPS POR INSTITUCIÓN',
      cuadros: [
        cuadro('Horas de uso LAPTOPS', 'Horas de uso de laptops por institución', 'INSTITUCIÓN', meses, prestamos,
          filasInstitucion, institucion, usoLaptop, true),
      ],
    },
  ];
}

/** "SEPTIEMBRE, 2026" si el período es un mes completo; si no, "01/09/2026 al 15/09/2026". */
function tituloPeriodo(periodo: Periodo): string {
  const mes = periodo.desde.slice(0, 7);
  const completo = periodoDeMes(mes);
  return periodo.desde === completo.desde && periodo.hasta === completo.hasta
    ? `${MESES_LARGOS[Number(mes.slice(5, 7)) - 1]}, ${mes.slice(0, 4)}`
    : `${formatearDia(periodo.desde)} al ${formatearDia(periodo.hasta)}`;
}

/** Arma el informe del período con el formato del reporte mensual. */
export async function generarInforme(periodo: Periodo): Promise<Informe> {
  const [prestamos, reservas] = await Promise.all([
    repositorio.listarRegistros(LAPTOPS.tablaRegistros),
    repositorio.listarRegistros(CUBICULOS.tablaRegistros),
  ]);
  const porInicio = (a: Registro, b: Registro) => a.inicio.localeCompare(b.inicio);
  const p = enPeriodo(prestamos, periodo).sort(porInicio);
  const r = enPeriodo(reservas, periodo).sort(porInicio);
  return {
    periodo,
    titulo: tituloPeriodo(periodo),
    servicios: [
      servicio('Cubículos de Estudio', 'reservas', r, usoCubiculo, true),
      servicio('Préstamos de Laptops', 'solicitudes', p, usoLaptop, false),
    ],
    comparativos: comparativos(prestamos, reservas, periodo.hasta),
    detallePrestamos: p,
    detalleReservas: r,
  };
}

/** Las líneas de un grupo o institución, iguales en pantalla y en el PDF. */
export function lineasGrupo(g: Grupo, unidad: string): string[] {
  const Unidad = unidad[0].toUpperCase() + unidad.slice(1);
  const lista = (c: Conteo[]) => c.map((x) => `${x.etiqueta} (${dosCifras(x.cantidad)})`).join(', ');
  return [
    `${Unidad}: ${dosCifras(g.cantidad)} (${dosCifras(g.usuarias)} usuarias, ${dosCifras(g.usuarios)} usuarios).`,
    ...(g.cursantes.length ? [`Cursantes de: ${lista(g.cursantes)}`] : []),
    `Motivos de uso: ${lista(g.motivos)}`,
    ...(g.usuariosCubiculos !== undefined ? [`Total usuarios en cubículos: ${dosCifras(g.usuariosCubiculos)}`] : []),
    `Horas de uso: ${horasYMinutos(g.minutos)}.`,
  ];
}

export function lineasInstitucion(b: BloqueInstitucion, unidad: string, conUsuarios: boolean): string[] {
  if (b.cantidad === 0) return [`Cantidad de ${unidad}: 00`];
  return [
    `Cantidad de ${unidad}: ${dosCifras(b.cantidad)}`,
    `Usuarias: ${dosCifras(b.usuarias)} | Usuarios: ${dosCifras(b.usuarios)}`,
    ...(b.usuariosCubiculos !== undefined ? [`Usuarios en cubículos: ${dosCifras(b.usuariosCubiculos)}`] : []),
    `Uso total de ${conUsuarios ? 'cubículos' : 'laptops'}: ${horasYMinutos(b.minutos)}`,
  ];
}
