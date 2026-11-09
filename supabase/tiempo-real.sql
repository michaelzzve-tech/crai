-- Activa el "tiempo real" de Supabase para que el planner de cubículos, el de salas
-- especiales y las laptops se actualicen al momento en todas las cuentas conectadas.
-- NO BORRA DATOS y se puede ejecutar varias veces.
-- Supabase → SQL Editor → New query → pegar todo → Run.
do $$
declare
  t text;
begin
  foreach t in array array['reservas', 'cubiculos', 'reservas_salas', 'mantenimiento_salas', 'prestamos', 'laptops'] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Para comprobar: debe mostrar las 6 tablas.
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;
