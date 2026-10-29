// Opciones de los menús desplegables. Para agregar o quitar una opción,
// basta con editar estas listas.

export const NO_APLICA = 'No aplica';

export const GENEROS = ['Masculino', 'Femenino', 'No aplica'];

export const INSTITUTOS = ['ITJO', 'IUJO', 'CFJO', 'Otro'];

export const CONDICIONES = ['Estudiante', 'Docente', 'Psicólogo', 'Otro'];
/** En Laptops también está DTI. */
export const CONDICIONES_LAPTOPS = ['Estudiante', 'Docente', 'Psicólogo', 'DTI', 'Otro'];
/** Con estas condiciones, "Carrera o año" y "Semestre, nivel o sección" quedan en "No aplica". */
export const CONDICIONES_SIN_CARRERA = ['Psicólogo', 'DTI'];
/** Con estas, se elige carrera y semestre del instituto como siempre, pero los menús también ofrecen "No aplica". */
export const CONDICIONES_CON_NO_APLICA = ['Docente'];

const ofreceNoAplica = (condicion: string) => CONDICIONES_CON_NO_APLICA.includes(condicion);
const conNoAplica = (opciones: string[], incluir: boolean) =>
  incluir && !opciones.includes(NO_APLICA) ? [...opciones, NO_APLICA] : opciones;

export const CARRERAS = ['Administración', 'Contaduría', 'Informática', 'Electrónica', 'Educación'];

export const ANIOS = ['1', '2', '3', '4', '5', '6'];

export const SEMESTRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'No aplica'];
/** Secciones de ITJO: con ese instituto, "Semestre, nivel o sección" muestra estas letras. */
export const SECCIONES_ITJO = ['A', 'B', 'C', 'D', 'E'];
/**
 * Opciones de "Semestre, nivel o sección" según el instituto. Incluye "No aplica" según la
 * condición (ver CONDICIONES_CON_NO_APLICA) o si se pide con `noAplica` (salas especiales).
 */
export const semestresDe = (instituto: string, condicion = '', noAplica = ofreceNoAplica(condicion)) =>
  conNoAplica(instituto === 'ITJO' ? SECCIONES_ITJO : SEMESTRES, noAplica);

export const CARRERAS_CFJO = ['Secretariado administrativo', 'Asistente administrativo', 'Analista contable'];

/**
 * Qué muestra el campo "Carrera o año" según el instituto elegido:
 * un menú con opciones, o un campo libre para escribir un número.
 */
export type CampoCarrera = { tipo: 'menu'; opciones: string[] } | { tipo: 'numero' };

export const CARRERA_POR_INSTITUTO: Record<string, CampoCarrera> = {
  ITJO: { tipo: 'menu', opciones: ANIOS },
  IUJO: { tipo: 'menu', opciones: CARRERAS },
  CFJO: { tipo: 'menu', opciones: CARRERAS_CFJO },
  // Otra institución: no hay carrera ni año; el campo queda en "No aplica".
  Otro: { tipo: 'menu', opciones: [NO_APLICA] },
};

/** "Carrera o año" según el instituto; "No aplica" se agrega igual que en semestresDe. */
export function campoCarreraDe(instituto: string, condicion = '', noAplica = ofreceNoAplica(condicion)): CampoCarrera | undefined {
  const campo = CARRERA_POR_INSTITUTO[instituto];
  return campo?.tipo === 'menu' ? { tipo: 'menu', opciones: conNoAplica(campo.opciones, noAplica) } : campo;
}

/** "Otro" va siempre al final: al elegirlo se escribe el motivo a mano (ver OTRO_MOTIVO). */
export const OTRO_MOTIVO = 'Otro';
export const MOTIVOS = ['Estudio', 'Tarea', 'Entretenimiento', 'TEG', 'Didáctico', OTRO_MOTIVO];
/** En Laptops también está Soporte. */
export const MOTIVOS_LAPTOPS = [...MOTIVOS.slice(0, -1), 'Soporte', OTRO_MOTIVO];

// La cantidad de laptops y de cubículos está en src/config/modulos.ts.
