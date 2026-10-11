// Tipos compartidos por toda la aplicación. Sirven para todos los módulos
// (laptops, cubículos…): un recurso numerado y sus préstamos o reservas.

export type EstadoRecurso = 'disponible' | 'ocupado' | 'mantenimiento';

export interface Recurso {
  id: string; // Lo que se muestra en los menús: "1", "2"… o un nombre como "POD"
  numero: number; // Orden en las listas
  estado: EstadoRecurso;
  notas?: string;
}

/** Un préstamo de laptop o una reserva de cubículo. */
export interface Registro {
  id: string;
  recursoId: string;
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  motivo: string;
  inicio: string; // Hora de inicio, ISO 8601
  fin: string; // Hora de fin, ISO 8601
  finReal?: string; // Cuándo se devolvió o liberó; vacío mientras está activo
  observaciones?: string;
}

/** Datos del formulario, en el mismo orden en que se muestran. */
export interface NuevoRegistro {
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  recursoId: string;
  motivo: string;
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
}
