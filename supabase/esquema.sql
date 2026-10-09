-- Tablas de la app de préstamo de laptops.
-- Copie todo este archivo en Supabase → SQL Editor → New query, y pulse "Run".

create table if not exists laptops (
  id text primary key,
  codigo text not null unique,
  marca text not null,
  modelo text not null,
  numero_serie text not null,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'prestada', 'mantenimiento')),
  notas text
);

create table if not exists prestamos (
  id text primary key,
  laptop_id text not null references laptops (id) on delete cascade,
  estudiante_nombre text not null,
  estudiante_carnet text not null,
  estudiante_correo text,
  encargado text not null,
  fecha_prestamo timestamptz not null,
  fecha_limite timestamptz not null,
  fecha_devolucion timestamptz,
  observaciones_devolucion text
);

-- Seguridad: solo los bibliotecarios que inician sesión pueden leer y escribir.
-- Los visitantes sin sesión no ven ningún dato de los estudiantes.
alter table laptops enable row level security;
alter table prestamos enable row level security;

drop policy if exists "bibliotecarios" on laptops;
create policy "bibliotecarios" on laptops
  for all to authenticated using (true) with check (true);

drop policy if exists "bibliotecarios" on prestamos;
create policy "bibliotecarios" on prestamos
  for all to authenticated using (true) with check (true);
