// Módulos de la app. Cada módulo presta o reserva un tipo de recurso numerado
// (laptops, cubículos…) usando los mismos componentes y el mismo formulario.
// Para agregar otro módulo, añada una entrada aquí y sus tablas en supabase/esquema.sql.

export interface Modulo {
  id: string;
  recurso: string; // Nombre del campo del formulario: "Laptop"
  recursos: string; // Plural: "Laptops"
  total: number; // Recursos numerados del 1 a este número
  tablaRecursos: string; // Tabla de la base de datos con los recursos
  tablaRegistros: string; // Tabla de la base de datos con los préstamos o reservas
  registros: string; // "Préstamos"
  nuevo: string; // Título del formulario
  registrar: string; // Botón del formulario
  activos: string; // Título de la lista de registros en curso
  vencidos: string; // Tarjeta del resumen
  ocupado: string; // Estado del recurso mientras está en uso
  finalizar: string; // Botón para terminar un registro
  finalizado: string; // Columna del historial con la hora real de fin
  mensajeRegistrado: (numero: number, nombre: string) => string;
  mensajeFinalizado: (numero: number) => string;
}

export const LAPTOPS: Modulo = {
  id: 'laptops',
  recurso: 'Laptop',
  recursos: 'Laptops',
  total: 25,
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
  total: 6,
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
