-- Ejecutar DESPUÉS de la migración en un entorno de prueba.
-- Fallará de forma explícita ante accesos accidentales o RLS deshabilitado.
do $audit$
declare
  t text;
  expected_tables text[] := array[
    'restaurants','restaurant_members','categories','products','product_option_groups',
    'product_options','delivery_zones','orders','order_items','order_item_options','order_status_history'
  ];
begin
  foreach t in array expected_tables loop
    if not exists (
      select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then
      raise exception 'RLS deshabilitado o tabla ausente: %', t;
    end if;
    if pg_catalog.has_table_privilege('anon', 'public.' || t, 'INSERT')
      or pg_catalog.has_table_privilege('anon', 'public.' || t, 'UPDATE')
      or pg_catalog.has_table_privilege('anon', 'public.' || t, 'DELETE') then
      raise exception 'El público tiene permisos de escritura sobre: %', t;
    end if;
  end loop;
  foreach t in array array['restaurant_members','orders','order_items','order_item_options','order_status_history'] loop
    if pg_catalog.has_table_privilege('anon', 'public.' || t, 'SELECT') then
      raise exception 'El público puede consultar tabla privada: %', t;
    end if;
    if pg_catalog.has_table_privilege('authenticated', 'public.' || t, 'INSERT')
      or pg_catalog.has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
      or pg_catalog.has_table_privilege('authenticated', 'public.' || t, 'DELETE') then
      raise exception 'El navegador autenticado puede modificar tabla privada: %', t;
    end if;
  end loop;
  raise notice 'Revisión de RLS y grants: OK (no sustituye pruebas con dos usuarios).';
end $audit$;
