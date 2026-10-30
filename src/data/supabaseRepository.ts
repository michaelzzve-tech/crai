import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLA_RESERVAS_SALAS } from '../config/salas';
import type { Recurso, Registro, ReservaSala } from '../types';
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
  genero: string | null;
  instituto: string;
  condicion: string;
  carrera: string;
  semestre: string | null;
  usuarios: number | null;
  motivo: string;
  hora_inicio: string;
  hora_fin: string | null;
  fin_real: string | null;
  serie_id?: string | null; // Solo existe en la tabla de reservas de cubículos
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
  genero: f.genero ?? undefined,
  instituto: f.instituto,
  condicion: f.condicion,
  carrera: f.carrera,
  semestre: f.semestre ?? undefined,
  usuarios: f.usuarios ?? undefined,
  motivo: f.motivo,
  inicio: iso(f.hora_inicio),
  fin: f.hora_fin ? iso(f.hora_fin) : undefined,
  finReal: f.fin_real ? iso(f.fin_real) : undefined,
  serieId: f.serie_id ?? undefined,
});

const aFilaRegistro = (r: Registro): FilaRegistro => ({
  id: r.id,
  recurso_id: r.recursoId,
  nombre: r.nombre,
  genero: r.genero ?? null,
  instituto: r.instituto,
  condicion: r.condicion,
  carrera: r.carrera,
  semestre: r.semestre ?? null,
  usuarios: r.usuarios ?? null,
  motivo: r.motivo,
  hora_inicio: r.inicio,
  hora_fin: r.fin ?? null,
  fin_real: r.finReal ?? null,
  // Se envía solo si hay serie, para no pedir esa columna a la tabla de préstamos de laptops.
  ...(r.serieId ? { serie_id: r.serieId } : {}),
});

interface FilaReservaSala {
  id: string;
  sala_id: string;
  instituto: string;
  carrera: string;
  semestre: string;
  actividad: string;
  usuarios: number;
  solicitante: string;
  profesor: string;
  hora_inicio: string;
  hora_fin: string;
  creada: string;
  fecha_solicitud: string | null;
  serie_id: string | null;
}

const aReservaSala = (f: FilaReservaSala): ReservaSala => ({
  id: f.id,
  salaId: f.sala_id,
  instituto: f.instituto,
  carrera: f.carrera,
  semestre: f.semestre,
  actividad: f.actividad,
  usuarios: f.usuarios,
  solicitante: f.solicitante,
  profesor: f.profesor,
  inicio: iso(f.hora_inicio),
  fin: iso(f.hora_fin),
  creada: iso(f.creada),
  fechaSolicitud: f.fecha_solicitud ?? undefined,
  serieId: f.serie_id ?? undefined,
});

const aFilaReservaSala = (r: ReservaSala): FilaReservaSala => ({
  id: r.id,
  sala_id: r.salaId,
  instituto: r.instituto,
  carrera: r.carrera,
  semestre: r.semestre,
  actividad: r.actividad,
  usuarios: r.usuarios,
  solicitante: r.solicitante,
  profesor: r.profesor,
  hora_inicio: r.inicio,
  hora_fin: r.fin,
  creada: r.creada,
  fecha_solicitud: r.fechaSolicitud || null,
  serie_id: r.serieId ?? null,
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

  async borrarRegistro(tabla: string, id: string) {
    const { error } = await this.db.from(tabla).delete().eq('id', id);
    revisar(error);
  }

  async borrarRegistros(tabla: string) {
    // Supabase exige un filtro para borrar; este incluye todas las filas.
    const { error } = await this.db.from(tabla).delete().not('id', 'is', null);
    revisar(error);
  }

  async listarReservasSalas() {
    const { data, error } = await this.db.from(TABLA_RESERVAS_SALAS).select('*');
    revisar(error);
    return (data as FilaReservaSala[]).map(aReservaSala);
  }

  async guardarReservaSala(reserva: ReservaSala) {
    const { error } = await this.db.from(TABLA_RESERVAS_SALAS).upsert(aFilaReservaSala(reserva));
    revisar(error);
  }

  async borrarReservaSala(id: string) {
    const { error } = await this.db.from(TABLA_RESERVAS_SALAS).delete().eq('id', id);
    revisar(error);
  }
}
