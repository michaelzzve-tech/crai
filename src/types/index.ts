// Tipos compartidos por toda la aplicación.

export type EstadoLaptop = 'disponible' | 'prestada' | 'mantenimiento';

export interface Laptop {
  id: string; // Igual al número como texto: "1", "2"…
  numero: number;
  estado: EstadoLaptop;
  notas?: string;
}

export interface Prestamo {
  id: string;
  laptopId: string;
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  motivo: string;
  fechaPrestamo: string; // Hora de inicio, ISO 8601
  fechaLimite: string; // Hora de fin, ISO 8601
  fechaDevolucion?: string; // ISO 8601, vacío mientras está activo
  observacionesDevolucion?: string;
}

/** Datos del formulario de préstamo, en el mismo orden en que se muestran. */
export interface NuevoPrestamo {
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  laptopId: string;
  motivo: string;
  horaInicio: string; // "HH:MM"
  horaFin: string; // "HH:MM"
}
