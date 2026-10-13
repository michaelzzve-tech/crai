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
  genero?: string; // Vacío en registros anteriores a este campo
  instituto: string;
  condicion: string;
  carrera: string;
  semestre?: string; // Vacío en registros anteriores a este campo
  usuarios?: number; // Cantidad de usuarios (solo reservas de cubículos)
  motivo: string;
  inicio: string; // Hora de inicio, ISO 8601
  fin?: string; // Hora de fin prevista, ISO 8601 (solo módulos con hora de fin)
  finReal?: string; // Cuándo se devolvió o liberó; vacío mientras está activo
}

/** Datos del formulario, en el mismo orden en que se muestran. */
export interface NuevoRegistro {
  nombre: string;
  genero: string;
  instituto: string;
  condicion: string;
  carrera: string;
  semestre: string;
  usuarios: string; // Vacío en módulos sin cantidad de usuarios
  recursoId: string;
  motivo: string;
  fecha: string; // Día de la reserva, "AAAA-MM-DD" (solo módulos con hora de fin; si no, hoy)
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"; vacío en módulos sin hora de fin
}
