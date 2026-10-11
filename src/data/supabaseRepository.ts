import type { SupabaseClient } from '@supabase/supabase-js';
import type { Laptop, Prestamo } from '../types';
import type { Repositorio } from './repository';

// La base de datos usa nombres en snake_case (ver supabase/esquema.sql);
// estas funciones traducen entre esas columnas y los tipos de la app.

interface FilaLaptop {
  id: string;
  numero: number;
  estado: Laptop['estado'];
  notas: string | null;
}

interface FilaPrestamo {
  id: string;
  laptop_id: string;
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  motivo: string;
  hora_inicio: string;
  hora_fin: string;
  fecha_devolucion: string | null;
  observaciones_devolucion: string | null;
}

const iso = (fecha: string) => new Date(fecha).toISOString();

const aLaptop = (f: FilaLaptop): Laptop => ({
  id: f.id,
  numero: f.numero,
  estado: f.estado,
  notas: f.notas ?? undefined,
});

const aFilaLaptop = (l: Laptop): FilaLaptop => ({
  id: l.id,
  numero: l.numero,
  estado: l.estado,
  notas: l.notas ?? null,
});

const aPrestamo = (f: FilaPrestamo): Prestamo => ({
  id: f.id,
  laptopId: f.laptop_id,
  nombre: f.nombre,
  instituto: f.instituto,
  condicion: f.condicion,
  carrera: f.carrera,
  motivo: f.motivo,
  fechaPrestamo: iso(f.hora_inicio),
  fechaLimite: iso(f.hora_fin),
  fechaDevolucion: f.fecha_devolucion ? iso(f.fecha_devolucion) : undefined,
  observacionesDevolucion: f.observaciones_devolucion ?? undefined,
});

const aFilaPrestamo = (p: Prestamo): FilaPrestamo => ({
  id: p.id,
  laptop_id: p.laptopId,
  nombre: p.nombre,
  instituto: p.instituto,
  condicion: p.condicion,
  carrera: p.carrera,
  motivo: p.motivo,
  hora_inicio: p.fechaPrestamo,
  hora_fin: p.fechaLimite,
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
