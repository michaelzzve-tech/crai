// Módulos de la app. Cada módulo presta o reserva un tipo de recurso numerado
// (laptops, cubículos…) usando los mismos componentes y el mismo formulario.
// Para agregar otro módulo, añada una entrada aquí y sus tablas en supabase/esquema.sql.

/** ["1", "2", …, "n"] */
const del1Al = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));

export interface Modulo {
  id: string;
  recurso: string; // Nombre del campo del formulario: "Laptop"
  recursos: string; // Plural: "Laptops"
  opciones: string[]; // Opciones del menú: "1", "2"… y nombres como "POD"
  // true: el formulario pide hora de fin y muestra la duración (y hay vencidos).
  // false: solo hora de inicio; la hora de fin se toma sola al devolver y se
  // muestra el tiempo transcurrido.
  conHoraFin: boolean;
  tablaRecursos: string; // Tabla de la base de datos con los recursos
  tablaRegistros: string; // Tabla de la base de datos con los préstamos o reservas
  registros: string; // "Préstamos"
  nuevo: string; // Título del formulario
  registrar: string; // Botón del formulario
  activos: string; // Título de la lista de registros en curso
  vencidos: string; // Tarjeta del resumen (solo si conHoraFin)
  ocupado: string; // Estado del recurso mientras está en uso
  finalizar: string; // Botón para terminar un registro
  finalizado: string; // Columna del historial con la hora real de fin
  mensajeRegistrado: (recurso: string, nombre: string) => string;
  mensajeFinalizado: (recurso: string) => string;
}

export const LAPTOPS: Modulo = {
  id: 'laptops',
  recurso: 'Laptop',
  recursos: 'Laptops',
  opciones: del1Al(25),
  conHoraFin: false,
  tablaRecursos: 'laptops',
  tablaRegistros: 'prestamos',
  registros: 'Préstamos',
  nuevo: 'Nuevo préstamo',
  registrar: 'Registrar préstamo',
  activos: 'Préstamos activos',
  vencidos: 'Préstamos vencidos',
  ocupado: 'Prestada',
  finalizar: 'Registrar devolución',
  finalizado: 'Devuelta',
  mensajeRegistrado: (n, nombre) => `Laptop ${n} prestada a ${nombre}.`,
  mensajeFinalizado: (n) => `Laptop ${n} devuelta.`,
};

export const CUBICULOS: Modulo = {
  id: 'cubiculos',
  recurso: 'Cubículo',
  recursos: 'Cubículos',
  opciones: [...del1Al(6), 'POD'],
  conHoraFin: true,
  tablaRecursos: 'cubiculos',
  tablaRegistros: 'reservas',
  registros: 'Reservas',
  nuevo: 'Nueva reserva',
  registrar: 'Registrar reserva',
  activos: 'Reservas activas',
  vencidos: 'Reservas vencidas',
  ocupado: 'Reservado',
  finalizar: 'Registrar salida',
  finalizado: 'Liberado',
  mensajeRegistrado: (n, nombre) => `Cubículo ${n} reservado para ${nombre}.`,
  mensajeFinalizado: (n) => `Cubículo ${n} liberado.`,
};

export const MODULOS: Modulo[] = [LAPTOPS, CUBICULOS];
