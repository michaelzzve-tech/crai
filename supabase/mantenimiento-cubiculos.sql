-- Ejecutar en Supabase → SQL Editor. No borra ni modifica registros existentes.
create table if not exists public.mantenimiento_cubiculos (
  id text primary key,
  recurso_id text not null references public.cubiculos(id),
  inicio timestamptz not null,
  fin timestamptz,
  nota text,
  creado timestamptz not null default now(),
  constraint mantenimiento_cubiculos_horario check (fin is null or fin > inicio)
);
alter table public.mantenimiento_cubiculos enable row level security;
grant select, insert, update, delete on public.mantenimiento_cubiculos to authenticated;
drop policy if exists "bibliotecarios" on public.mantenimiento_cubiculos;
create policy "bibliotecarios" on public.mantenimiento_cubiculos
  for all to authenticated using (true) with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mantenimiento_cubiculos') then
    alter publication supabase_realtime add table public.mantenimiento_cubiculos;
  end if;
end $$;
