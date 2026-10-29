-- Tabla del módulo Salas especiales. NO BORRA DATOS: se puede ejecutar aunque ya
-- existan las demás tablas, y varias veces sin problema.
-- Supabase → SQL Editor → New query → pegar todo → Run.

create table if not exists reservas_salas (
  id text primary key,
  sala_id text not null, -- javier, loyola, basabe o piedra (ver src/config/salas.ts)
  instituto text not null,
  carrera text not null,
  semestre text not null,
  actividad text not null,
  usuarios integer not null check (usuarios > 0),
  solicitante text not null, -- "Solicitado por"
  profesor text not null, -- "Profesor(a)"
  hora_inicio timestamptz not null,
  hora_fin timestamptz not null,
  creada timestamptz not null default now(), -- cuándo se registró la reserva
  serie_id text -- mismo valor en todas las fechas de una reserva recurrente; vacío si es de una sola fecha
);

-- Columna de las reservas recurrentes (para tablas creadas antes de que existiera).
alter table reservas_salas add column if not exists serie_id text;

-- Seguridad: solo los administradores que inician sesión pueden leer y escribir.
alter table reservas_salas enable row level security;
drop policy if exists "bibliotecarios" on reservas_salas;
create policy "bibliotecarios" on reservas_salas for all to authenticated using (true) with check (true);
