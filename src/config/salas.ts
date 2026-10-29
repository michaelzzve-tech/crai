// Módulo "Salas especiales": salas que se reservan por fecha y horario desde un
// calendario semanal. Para agregar o cambiar una sala basta con editar SALAS.

export interface Sala {
  id: string; // Código que se guarda en la base de datos; no cambiarlo si ya hay reservas
  nombre: string;
  capacidad: number; // Máximo de personas
  color: string; // Color de la sala en el calendario
}

// Colores probados para distinguirse entre sí, también con daltonismo.
export const SALAS: Sala[] = [
  { id: 'javier', nombre: 'Sala Javier', capacidad: 24, color: '#2a78d6' },
  { id: 'loyola', nombre: 'Sala Loyola', capacidad: 32, color: '#eb6834' },
  { id: 'basabe', nombre: 'Sala Basabe', capacidad: 50, color: '#1baf7a' },
  { id: 'piedra', nombre: 'Sala Piedra', capacidad: 50, color: '#eda100' },
];

export const salaPorId = (id: string): Sala | undefined => SALAS.find((s) => s.id === id);

/** Horas que muestra el calendario: de 7:00 a. m. a 9:00 p. m. */
export const HORA_APERTURA = 7;
export const HORA_CIERRE = 21;

/** Sugerencias del campo "Actividad" (también se puede escribir otra). */
export const ACTIVIDADES = ['Clase', 'Taller', 'Charla', 'Conferencia', 'Reunión', 'Proyección', 'Evaluación', 'Evento'];

/** Tabla de la base de datos con las reservas de salas. */
export const TABLA_RESERVAS_SALAS = 'reservas_salas';
