-- Tablas de la app de préstamo de laptops.
-- Copie todo este archivo en Supabase → SQL Editor → New query, y pulse "Run".
-- Si ya había ejecutado una versión anterior de este archivo, ejecútelo de nuevo:
-- borra las tablas anteriores y las crea con los campos nuevos.
-- ¡Atención! Borra todos los datos guardados: ejecútelo solo al configurar la base de datos.

drop table if exists prestamos;
drop table if exists laptops;

-- Laptops numeradas del 1 al 25. La app las crea sola la primera vez.
create table laptops (
  id text primary key,
  numero integer not null unique,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'prestada', 'mantenimiento')),
  notas text
);

create table prestamos (
  id text primary key,
  laptop_id text not null references laptops (id),
  nombre text not null,
  instituto text not null,
  condicion text not null,
  carrera text not null,
  motivo text not null,
  hora_inicio timestamptz not null,
  hora_fin timestamptz not null,
  fecha_devolucion timestamptz,
  observaciones_devolucion text
);

-- Seguridad: solo los bibliotecarios que inician sesión pueden leer y escribir.
-- Los visitantes sin sesión no ven ningún dato.
alter table laptops enable row level security;
alter table prestamos enable row level security;

create policy "bibliotecarios" on laptops
  for all to authenticated using (true) with check (true);

create policy "bibliotecarios" on prestamos
  for all to authenticated using (true) with check (true);
