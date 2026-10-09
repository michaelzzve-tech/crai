// Tipos compartidos por toda la aplicación.

export type EstadoLaptop = 'disponible' | 'prestada' | 'mantenimiento';

export interface Laptop {
  id: string;
  codigo: string; // Etiqueta de inventario de la biblioteca, p. ej. "LAP-001"
  marca: string;
  modelo: string;
  numeroSerie: string;
  estado: EstadoLaptop;
  notas?: string;
}

export interface Prestamo {
  id: string;
  laptopId: string;
  estudianteNombre: string;
  estudianteCarnet: string; // Número de carnet / ID universitario
  estudianteCorreo?: string;
  encargado: string; // Bibliotecario que entrega la laptop
  fechaPrestamo: string; // ISO 8601
  fechaLimite: string; // ISO 8601
  fechaDevolucion?: string; // ISO 8601, vacío mientras está activo
  observacionesDevolucion?: string;
}

export type NuevaLaptop = Omit<Laptop, 'id' | 'estado'>;

export interface NuevoPrestamo {
  laptopId: string;
  estudianteNombre: string;
  estudianteCarnet: string;
  estudianteCorreo?: string;
  encargado: string;
  horas: number; // Duración del préstamo
}
