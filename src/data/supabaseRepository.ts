import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recurso, Registro } from '../types';
import type { Repositorio } from './repository';

// La base de datos usa nombres en snake_case (ver supabase/esquema.sql);
// estas funciones traducen entre esas columnas y los tipos de la app.
// Todas las tablas de recursos tienen las mismas columnas, y también
// todas las de registros.

interface FilaRecurso {
  id: string;
  numero: number;
  estado: Recurso['estado'];
  notas: string | null;
}

interface FilaRegistro {
  id: string;
  recurso_id: string;
  nombre: string;
  instituto: string;
  condicion: string;
  carrera: string;
  motivo: string;
  hora_inicio: string;
  hora_fin: string | null;
  fin_real: string | null;
}

const iso = (fecha: string) => new Date(fecha).toISOString();

const aRecurso = (f: FilaRecurso): Recurso => ({
  id: f.id,
  numero: f.numero,
  estado: f.estado,
  notas: f.notas ?? undefined,
});

const aFilaRecurso = (r: Recurso): FilaRecurso => ({
  id: r.id,
  numero: r.numero,
  estado: r.estado,
  notas: r.notas ?? null,
});

const aRegistro = (f: FilaRegistro): Registro => ({
  id: f.id,
  recursoId: f.recurso_id,
  nombre: f.nombre,
  instituto: f.instituto,
  condicion: f.condicion,
  carrera: f.carrera,
  motivo: f.motivo,
  inicio: iso(f.hora_inicio),
  fin: f.hora_fin ? iso(f.hora_fin) : undefined,
  finReal: f.fin_real ? iso(f.fin_real) : undefined,
});

const aFilaRegistro = (r: Registro): FilaRegistro => ({
  id: r.id,
  recurso_id: r.recursoId,
  nombre: r.nombre,
  instituto: r.instituto,
  condicion: r.condicion,
  carrera: r.carrera,
  motivo: r.motivo,
  hora_inicio: r.inicio,
  hora_fin: r.fin ?? null,
  fin_real: r.finReal ?? null,
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

  async listarRecursos(tabla: string) {
    const { data, error } = await this.db.from(tabla).select('*');
    revisar(error);
    return (data as FilaRecurso[]).map(aRecurso);
  }

  async guardarRecurso(tabla: string, recurso: Recurso) {
    const { error } = await this.db.from(tabla).upsert(aFilaRecurso(recurso));
    revisar(error);
  }

  async listarRegistros(tabla: string) {
    const { data, error } = await this.db.from(tabla).select('*');
    revisar(error);
    return (data as FilaRegistro[]).map(aRegistro);
  }

  async guardarRegistro(tabla: string, registro: Registro) {
    const { error } = await this.db.from(tabla).upsert(aFilaRegistro(registro));
    revisar(error);
  }
}
