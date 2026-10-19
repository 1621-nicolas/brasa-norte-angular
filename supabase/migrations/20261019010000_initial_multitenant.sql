-- Brasa Norte V0.3 · esquema inicial multi-restaurante
-- IMPORTANTE: ejecutarlo en un proyecto Supabase de DESARROLLO.
-- Ningún pedido real puede crearse desde el navegador con esta migración.
begin;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text not null default '' check (char_length(phone) <= 20),
  opening_hours text not null default '' check (char_length(opening_hours) <= 160),
  accepting_orders boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_members_user_idx on public.restaurant_members (user_id, restaurant_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0 check (position >= 0),
  active boolean not null default true,
  unique (restaurant_id, id)
);
create index categories_restaurant_idx on public.categories (restaurant_id, position);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price_cents integer not null check (price_cents between 0 and 10000000),
  emoji text not null default '🍽️' check (char_length(emoji) <= 20),
  tag text not null default '' check (char_length(tag) <= 50),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  active boolean not null default true,
  available boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  foreign key (restaurant_id, category_id)
    references public.categories(restaurant_id, id) on delete restrict
);
create index products_restaurant_idx on public.products (restaurant_id, category_id, position);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  product_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select between 1 and 20),
  position integer not null default 0 check (position >= 0),
  constraint group_bounds check (min_select <= max_select),
  unique (restaurant_id, id),
  foreign key (restaurant_id, product_id)
    references public.products(restaurant_id, id) on delete cascade
);
create index product_option_groups_product_idx on public.product_option_groups(restaurant_id, product_id);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  group_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  extra_price_cents integer not null default 0 check (extra_price_cents between 0 and 10000000),
  active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  foreign key (restaurant_id, group_id)
    references public.product_option_groups(restaurant_id, id) on delete cascade
);
create index product_options_group_idx on public.product_options(restaurant_id, group_id, position);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  fee_cents integer not null default 0 check (fee_cents between 0 and 1000000),
  active boolean not null default true,
  unique (restaurant_id, id)
);
create index delivery_zones_restaurant_idx on public.delivery_zones(restaurant_id);

-- Tablas privadas. Inserción y transición de pedidos SOLO desde un backend seguro futuro.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  code text not null check (char_length(code) between 1 and 40),
  idempotency_key uuid not null,
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 120),
  customer_phone text not null check (char_length(customer_phone) between 7 and 20),
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  delivery_zone_id uuid,
  delivery_address text not null default '' check (char_length(delivery_address) <= 500),
  notes text not null default '' check (char_length(notes) <= 1000),
  payment_method text not null check (payment_method in ('efectivo', 'yape')),
  payment_status text not null default 'pendiente'
    check (payment_status in ('pendiente', 'verificado')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer generated always as (subtotal_cents + delivery_fee_cents) stored,
  status text not null default 'pendiente'
    check (status in ('pendiente','confirmado','preparando','listo','en_camino','entregado','cancelado')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  unique (restaurant_id, code),
  unique (restaurant_id, idempotency_key),
  foreign key (restaurant_id, delivery_zone_id)
    references public.delivery_zones(restaurant_id, id),
  constraint delivery_address_required check (
    fulfillment = 'pickup' or (length(trim(delivery_address)) > 0 and delivery_zone_id is not null)
  ),
  constraint pickup_no_delivery_fee check (
    fulfillment = 'delivery' or (delivery_zone_id is null and delivery_fee_cents = 0)
  )
);
create index orders_restaurant_created_idx on public.orders(restaurant_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  product_id uuid,
  product_name_snapshot text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  unique (restaurant_id, id),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id) on delete cascade,
  foreign key (restaurant_id, product_id) references public.products(restaurant_id, id)
);
create index order_items_order_idx on public.order_items(restaurant_id, order_id);

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_item_id uuid not null,
  option_name_snapshot text not null,
  extra_price_cents integer not null check (extra_price_cents >= 0),
  foreign key (restaurant_id, order_item_id)
    references public.order_items(restaurant_id, id) on delete cascade
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  actor_user_id uuid references auth.users(id),
  old_status text,
  new_status text not null,
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id) on delete cascade
);
create index order_history_order_idx on public.order_status_history(restaurant_id, order_id, created_at);

-- RLS obligatorio en absolutamente todas las tablas expuestas.
alter table public.restaurants enable row level security;
revoke all on table public.restaurants from anon, authenticated;
alter table public.restaurant_members enable row level security;
revoke all on table public.restaurant_members from anon, authenticated;
alter table public.categories enable row level security;
revoke all on table public.categories from anon, authenticated;
alter table public.products enable row level security;
revoke all on table public.products from anon, authenticated;
alter table public.product_option_groups enable row level security;
revoke all on table public.product_option_groups from anon, authenticated;
alter table public.product_options enable row level security;
revoke all on table public.product_options from anon, authenticated;
alter table public.delivery_zones enable row level security;
revoke all on table public.delivery_zones from anon, authenticated;
alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
alter table public.order_items enable row level security;
revoke all on table public.order_items from anon, authenticated;
alter table public.order_item_options enable row level security;
revoke all on table public.order_item_options from anon, authenticated;
alter table public.order_status_history enable row level security;
revoke all on table public.order_status_history from anon, authenticated;

-- Ningún usuario puede darse rol a sí mismo. Altas de propietarios solo por administración confiable.
grant select on public.restaurant_members to authenticated;
create policy "members read own membership" on public.restaurant_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Un miembro autenticado ve su restaurante en borrador; el visitante solo ve publicados.
grant select on public.restaurants to anon, authenticated;
create policy "public or member read restaurants" on public.restaurants
  for select to anon, authenticated using (
    published or exists (
      select 1 from public.restaurant_members m
      where m.restaurant_id = id and m.user_id = (select auth.uid())
    )
  );
grant update (name, phone, opening_hours, accepting_orders) on public.restaurants to authenticated;
create policy "owners update restaurant settings" on public.restaurants
  for update to authenticated
  using (exists (select 1 from public.restaurant_members m where m.restaurant_id = id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')))
  with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

-- Funciones y vistas comerciales deben respetar pertenencia y publicación; NO exponer pedidos.

grant select on public.categories to anon, authenticated;
create policy "public or member read categories" on public.categories
  for select to anon, authenticated using (((active) and exists (select 1 from public.restaurants r where r.id = categories.restaurant_id and r.published)) or (exists (select 1 from public.restaurant_members m where m.restaurant_id = categories.restaurant_id and m.user_id = (select auth.uid()))));
grant insert on public.categories to authenticated;
create policy "managers insert categories" on public.categories
  for insert to authenticated with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = categories.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
grant update (name, position, active) on public.categories to authenticated;
create policy "managers update categories" on public.categories
  for update to authenticated using (exists (select 1 from public.restaurant_members m where m.restaurant_id = categories.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager'))) with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = categories.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

grant select on public.products to anon, authenticated;
create policy "public or member read products" on public.products
  for select to anon, authenticated using (((active) and exists (select 1 from public.restaurants r where r.id = products.restaurant_id and r.published)) or (exists (select 1 from public.restaurant_members m where m.restaurant_id = products.restaurant_id and m.user_id = (select auth.uid()))));
grant insert on public.products to authenticated;
create policy "managers insert products" on public.products
  for insert to authenticated with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = products.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
grant update (category_id, name, description, price_cents, emoji, tag, image_url, active, available, position) on public.products to authenticated;
create policy "managers update products" on public.products
  for update to authenticated using (exists (select 1 from public.restaurant_members m where m.restaurant_id = products.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager'))) with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = products.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

grant select on public.product_option_groups to anon, authenticated;
create policy "public or member read product_option_groups" on public.product_option_groups
  for select to anon, authenticated using (((exists (select 1 from public.products p where p.id = product_id and p.restaurant_id = product_option_groups.restaurant_id and p.active)) and exists (select 1 from public.restaurants r where r.id = product_option_groups.restaurant_id and r.published)) or (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_option_groups.restaurant_id and m.user_id = (select auth.uid()))));
grant insert on public.product_option_groups to authenticated;
create policy "managers insert product_option_groups" on public.product_option_groups
  for insert to authenticated with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_option_groups.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
grant update (product_id, name, min_select, max_select, position) on public.product_option_groups to authenticated;
create policy "managers update product_option_groups" on public.product_option_groups
  for update to authenticated using (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_option_groups.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager'))) with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_option_groups.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

grant select on public.product_options to anon, authenticated;
create policy "public or member read product_options" on public.product_options
  for select to anon, authenticated using (((active and exists (select 1 from public.product_option_groups g join public.products p on p.id = g.product_id and p.restaurant_id = g.restaurant_id where g.id = group_id and g.restaurant_id = product_options.restaurant_id and p.active)) and exists (select 1 from public.restaurants r where r.id = product_options.restaurant_id and r.published)) or (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_options.restaurant_id and m.user_id = (select auth.uid()))));
grant insert on public.product_options to authenticated;
create policy "managers insert product_options" on public.product_options
  for insert to authenticated with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_options.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
grant update (group_id, name, extra_price_cents, active, position) on public.product_options to authenticated;
create policy "managers update product_options" on public.product_options
  for update to authenticated using (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_options.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager'))) with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = product_options.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

grant select on public.delivery_zones to anon, authenticated;
create policy "public or member read delivery_zones" on public.delivery_zones
  for select to anon, authenticated using (((active) and exists (select 1 from public.restaurants r where r.id = delivery_zones.restaurant_id and r.published)) or (exists (select 1 from public.restaurant_members m where m.restaurant_id = delivery_zones.restaurant_id and m.user_id = (select auth.uid()))));
grant insert on public.delivery_zones to authenticated;
create policy "managers insert delivery_zones" on public.delivery_zones
  for insert to authenticated with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = delivery_zones.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
grant update (name, fee_cents, active) on public.delivery_zones to authenticated;
create policy "managers update delivery_zones" on public.delivery_zones
  for update to authenticated using (exists (select 1 from public.restaurant_members m where m.restaurant_id = delivery_zones.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager'))) with check (exists (select 1 from public.restaurant_members m where m.restaurant_id = delivery_zones.restaurant_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

grant select on public.orders to authenticated;
create policy "members read orders" on public.orders
  for select to authenticated using (
    exists (select 1 from public.restaurant_members m
      where m.restaurant_id = orders.restaurant_id and m.user_id = (select auth.uid()))
  );

grant select on public.order_items to authenticated;
create policy "members read order_items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.restaurant_members m
      where m.restaurant_id = order_items.restaurant_id and m.user_id = (select auth.uid()))
  );

grant select on public.order_item_options to authenticated;
create policy "members read order_item_options" on public.order_item_options
  for select to authenticated using (
    exists (select 1 from public.restaurant_members m
      where m.restaurant_id = order_item_options.restaurant_id and m.user_id = (select auth.uid()))
  );

grant select on public.order_status_history to authenticated;
create policy "members read order_status_history" on public.order_status_history
  for select to authenticated using (
    exists (select 1 from public.restaurant_members m
      where m.restaurant_id = order_status_history.restaurant_id and m.user_id = (select auth.uid()))
  );

-- Sin INSERT/UPDATE/DELETE de pedidos para anon ni authenticated. El backend
-- recalculará totales, validará extras y estados, limitará abuso y asegurará idempotencia.
commit;
