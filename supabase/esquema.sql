-- Tablas de la app de préstamos y reservas de la biblioteca.
-- Copie todo este archivo en Supabase → SQL Editor → New query, y pulse "Run".
-- Si ya había ejecutado una versión anterior de este archivo, ejecútelo de nuevo:
-- borra las tablas anteriores y las crea con los campos nuevos.
-- ¡Atención! Borra todos los datos guardados: ejecútelo solo al configurar la base de datos.

drop table if exists prestamos;
drop table if exists laptops;
drop table if exists reservas;
drop table if exists cubiculos;
drop table if exists reservas_salas;

-- Recursos: laptops del 1 al 25 y del 55 al 80, y cubículos del 1 al 6 más el Podcast (código "POD").
-- La app los crea sola la primera vez.
create table laptops (
  id text primary key,
  numero integer not null unique,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'ocupado', 'mantenimiento')),
  notas text
);

create table cubiculos (like laptops including all);

-- Préstamos de laptops y reservas de cubículos (mismos campos).
create table prestamos (
  id text primary key,
  recurso_id text not null references laptops (id),
  nombre text not null,
  genero text,
  instituto text not null,
  condicion text not null,
  carrera text not null,
  semestre text,
  usuarios integer, -- cantidad de usuarios (solo reservas de cubículos)
  motivo text not null,
  hora_inicio timestamptz not null,
  hora_fin timestamptz, -- vacío en préstamos de laptops (se usa fin_real)
  fin_real timestamptz
);

create table reservas (
  like prestamos including all,
  foreign key (recurso_id) references cubiculos (id)
);

-- Reservas de las salas especiales (Sala Javier, Loyola, Basabe y Piedra).
create table reservas_salas (
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
  serie_id text, -- mismo valor en todas las fechas de una reserva recurrente; vacío si es de una sola fecha
  fecha_solicitud date -- cuándo se pidió la sala (solo informativo); vacío en reservas viejas
);

-- Seguridad: solo los bibliotecarios que inician sesión pueden leer y escribir.
-- Los visitantes sin sesión no ven ningún dato.
alter table laptops enable row level security;
alter table cubiculos enable row level security;
alter table prestamos enable row level security;
alter table reservas enable row level security;
alter table reservas_salas enable row level security;

create policy "bibliotecarios" on laptops for all to authenticated using (true) with check (true);
create policy "bibliotecarios" on cubiculos for all to authenticated using (true) with check (true);
create policy "bibliotecarios" on prestamos for all to authenticated using (true) with check (true);
create policy "bibliotecarios" on reservas for all to authenticated using (true) with check (true);
create policy "bibliotecarios" on reservas_salas for all to authenticated using (true) with check (true);
