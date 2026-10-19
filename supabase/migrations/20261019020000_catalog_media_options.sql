-- Brasa Norte V0.6 · Fotos de productos y grupos de extras.
-- No crea ni habilita pedidos. Conserva todos los datos existentes.
begin;

-- Permite ocultar temporalmente un grupo de opciones sin eliminarlo.
alter table public.product_option_groups
  add column if not exists active boolean not null default true;
grant update (active) on public.product_option_groups to authenticated;

-- Evita colocar en un restaurante la URL de foto de OTRO restaurante o un dominio externo.
alter table public.products
  add constraint products_image_url_own_bucket check (
    image_url is null or
    starts_with(
      image_url,
      'https://anrkxjythmkzttcypjmy.supabase.co/storage/v1/object/public/restaurant-images/'
        || restaurant_id::text || '/'
    )
  );

-- Opciones de grupos ocultos no se deben servir a clientes públicos.
drop policy if exists "public read product_option_groups" on public.product_option_groups;
create policy "public read product_option_groups" on public.product_option_groups
 for select to anon, authenticated using (
   active
   and exists (
     select 1 from public.products p
     join public.categories c on c.id=p.category_id and c.restaurant_id=p.restaurant_id
     join public.restaurants r on r.id=p.restaurant_id
     where p.id=product_option_groups.product_id
       and p.restaurant_id=product_option_groups.restaurant_id
       and p.active and c.active and r.published
   )
 );

drop policy if exists "public read product_options" on public.product_options;
create policy "public read product_options" on public.product_options
 for select to anon, authenticated using (
   active
   and exists (
     select 1 from public.product_option_groups g
     join public.products p on p.id=g.product_id and p.restaurant_id=g.restaurant_id
     join public.categories c on c.id=p.category_id and c.restaurant_id=p.restaurant_id
     join public.restaurants r on r.id=p.restaurant_id
     where g.id=product_options.group_id
       and g.restaurant_id=product_options.restaurant_id
       and g.active and p.active and c.active and r.published
   )
 );

-- Imágenes de catálogo exclusivamente. NO subir documentos ni fotos personales.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-images', 'restaurant-images', true, 2097152,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do nothing;

-- Se permite una subida nueva sólo si el usuario es owner/manager de la
-- carpeta identificada por el UUID de su propio restaurante.
create policy "restaurant editors upload their catalog images"
 on storage.objects for insert to authenticated
 with check (
   bucket_id = 'restaurant-images'
   and array_length(storage.foldername(name), 1) = 1
   and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
   and exists (
     select 1 from public.restaurant_members m
     where m.restaurant_id::text = (storage.foldername(name))[1]
       and m.user_id = (select auth.uid())
       and m.role in ('owner','manager')
   )
 );
-- No otorgar SELECT/UPDATE/DELETE de Storage: archivos son públicos por URL
-- y las subidas usan nombres únicos, sin sobreescritura.
commit;
