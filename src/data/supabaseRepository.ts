import type { SupabaseClient } from '@supabase/supabase-js';
import type { Laptop, Prestamo } from '../types';
import type { Repositorio } from './repository';

// La base de datos usa nombres en snake_case (ver supabase/esquema.sql);
// estas funciones traducen entre esas columnas y los tipos de la app.

interface FilaLaptop {
  id: string;
  codigo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  estado: Laptop['estado'];
  notas: string | null;
}

interface FilaPrestamo {
  id: string;
  laptop_id: string;
  estudiante_nombre: string;
  estudiante_carnet: string;
  estudiante_correo: string | null;
  encargado: string;
  fecha_prestamo: string;
  fecha_limite: string;
  fecha_devolucion: string | null;
  observaciones_devolucion: string | null;
}

const iso = (fecha: string) => new Date(fecha).toISOString();

const aLaptop = (f: FilaLaptop): Laptop => ({
  id: f.id,
  codigo: f.codigo,
  marca: f.marca,
  modelo: f.modelo,
  numeroSerie: f.numero_serie,
  estado: f.estado,
  notas: f.notas ?? undefined,
});

const aFilaLaptop = (l: Laptop): FilaLaptop => ({
  id: l.id,
  codigo: l.codigo,
  marca: l.marca,
  modelo: l.modelo,
  numero_serie: l.numeroSerie,
  estado: l.estado,
  notas: l.notas ?? null,
});

const aPrestamo = (f: FilaPrestamo): Prestamo => ({
  id: f.id,
  laptopId: f.laptop_id,
  estudianteNombre: f.estudiante_nombre,
  estudianteCarnet: f.estudiante_carnet,
  estudianteCorreo: f.estudiante_correo ?? undefined,
  encargado: f.encargado,
  fechaPrestamo: iso(f.fecha_prestamo),
  fechaLimite: iso(f.fecha_limite),
  fechaDevolucion: f.fecha_devolucion ? iso(f.fecha_devolucion) : undefined,
  observacionesDevolucion: f.observaciones_devolucion ?? undefined,
});

const aFilaPrestamo = (p: Prestamo): FilaPrestamo => ({
  id: p.id,
  laptop_id: p.laptopId,
  estudiante_nombre: p.estudianteNombre,
  estudiante_carnet: p.estudianteCarnet,
  estudiante_correo: p.estudianteCorreo ?? null,
  encargado: p.encargado,
  fecha_prestamo: p.fechaPrestamo,
  fecha_limite: p.fechaLimite,
  fecha_devolucion: p.fechaDevolucion ?? null,
  observaciones_devolucion: p.observacionesDevolucion ?? null,
});

function revisar(error: { message: string } | null): void {
  if (error) throw new Error(`Error de la base de datos: ${error.message}`);
}

/** Implementación que guarda los datos en Supabase (base de datos en línea). */
export class SupabaseRepositorio implements Repositorio {
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async listarLaptops() {
    const { data, error } = await this.db.from('laptops').select('*');
    revisar(error);
    return (data as FilaLaptop[]).map(aLaptop);
  }

  async guardarLaptop(laptop: Laptop) {
    const { error } = await this.db.from('laptops').upsert(aFilaLaptop(laptop));
    revisar(error);
  }

  async eliminarLaptop(id: string) {
    const { error } = await this.db.from('laptops').delete().eq('id', id);
    revisar(error);
  }

  async listarPrestamos() {
    const { data, error } = await this.db.from('prestamos').select('*');
    revisar(error);
    return (data as FilaPrestamo[]).map(aPrestamo);
  }

  async guardarPrestamo(prestamo: Prestamo) {
    const { error } = await this.db.from('prestamos').upsert(aFilaPrestamo(prestamo));
    revisar(error);
  }
}
