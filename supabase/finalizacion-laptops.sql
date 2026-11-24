-- No borra tablas ni registros. Ejecutar una vez en Supabase → SQL Editor.
-- Reutiliza hora_fin: los préstamos antiguos sin ese valor siguen siendo manuales.
-- Cada minuto, termina los préstamos vencidos incluso si la web está cerrada.
create extension if not exists pg_cron;

select cron.schedule(
  'crai-finalizar-laptops',
  '* * * * *',
  $tarea$
  do $cierre$
  declare
    afectados text[];
  begin
    with terminados as (
      update public.prestamos
      set fin_real = hora_fin
      where fin_real is null and hora_fin is not null
        and hora_fin > hora_inicio and hora_fin <= now()
      returning recurso_id
    )
    select array_agg(distinct recurso_id) into afectados from terminados;

    -- Conserva mantenimiento y respeta otro préstamo que ya esté en curso.
    update public.laptops l
    set estado = case when exists (
      select 1 from public.prestamos p
      where p.recurso_id = l.id and p.fin_real is null and p.hora_inicio <= now()
    ) then 'ocupado' else 'disponible' end
    where l.id = any(afectados) and l.estado <> 'mantenimiento';
  end
  $cierre$;
  $tarea$
);

-- Comprobación: debe aparecer una fila con active = true.
select jobname, schedule, active from cron.job where jobname = 'crai-finalizar-laptops';
