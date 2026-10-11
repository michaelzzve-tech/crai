// Opciones de los menús desplegables. Para agregar o quitar una opción,
// basta con editar estas listas.

export const INSTITUTOS = ['ITJO', 'IUJO', 'CFJO'];

export const CONDICIONES = ['Estudiante', 'Docente', 'Otro'];

export const CARRERAS = ['Administración', 'Contaduría', 'Informática', 'Electrónica', 'Educación'];

export const ANIOS = ['1', '2', '3', '4', '5', '6'];

/**
 * Qué muestra el campo "Carrera o año" según el instituto elegido:
 * un menú con opciones, o un campo libre para escribir un número.
 */
export type CampoCarrera = { tipo: 'menu'; opciones: string[] } | { tipo: 'numero' };

export const CARRERA_POR_INSTITUTO: Record<string, CampoCarrera> = {
  ITJO: { tipo: 'menu', opciones: ANIOS },
  IUJO: { tipo: 'menu', opciones: CARRERAS },
  CFJO: { tipo: 'numero' },
};

export const MOTIVOS = ['Estudio', 'Tarea', 'Entretenimiento'];

/** Cantidad de laptops de la biblioteca, numeradas del 1 a este número. */
export const TOTAL_LAPTOPS = 25;
