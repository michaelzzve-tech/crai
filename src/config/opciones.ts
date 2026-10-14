// Opciones de los menús desplegables. Para agregar o quitar una opción,
// basta con editar estas listas.

export const GENEROS = ['Masculino', 'Femenino'];

export const INSTITUTOS = ['ITJO', 'IUJO', 'CFJO'];

export const CONDICIONES = ['Estudiante', 'Docente', 'Otro'];

export const CARRERAS = ['Administración', 'Contaduría', 'Informática', 'Electrónica', 'Educación'];

export const ANIOS = ['1', '2', '3', '4', '5', '6'];

export const SEMESTRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'No aplica'];

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
};

export const MOTIVOS = ['Estudio', 'Tarea', 'Entretenimiento', 'TEG', 'Didáctico'];

// La cantidad de laptops y de cubículos está en src/config/modulos.ts.
