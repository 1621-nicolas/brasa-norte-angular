-- Brasa Norte: SOLO DATOS FICTICIOS. Ejecutar DESPUÉS de la migración.
-- Los restaurantes nacen DESPUBLICADOS; no se permiten pedidos reales.
begin;
insert into public.restaurants (id, slug, name, phone, opening_hours, accepting_orders, published) values
('10000000-0000-4000-8000-000000000001','brasa-norte','Brasa Norte','900000000','11:00 a 22:00',false,false),
('10000000-0000-4000-8000-000000000002','burger-demo','Burger Demo','900000001','12:00 a 23:00',false,false)
on conflict (id) do nothing;

insert into public.categories (id, restaurant_id, name, position) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Pollos a la brasa',1),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Bebidas',2),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Hamburguesas',1)
on conflict (id) do nothing;

insert into public.products(id,restaurant_id,category_id,name,description,price_cents,emoji,tag,position) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','1/4 de pollo clásico','Pollo con papas y ensalada (ejemplo).',1890,'🍗','El favorito',1),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Chicha morada','Vaso 500 ml (ejemplo).',700,'🥤','',2),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','Burger de prueba','Hamburguesa de demostración.',2190,'🍔','',1)
on conflict (id) do nothing;

insert into public.product_option_groups(id,restaurant_id,product_id,name,min_select,max_select,position) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Acompañamiento',1,1,1)
on conflict (id) do nothing;

insert into public.product_options(id,restaurant_id,group_id,name,extra_price_cents,position) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Papas clásicas',0,1),
('50000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Papas grandes',300,2)
on conflict (id) do nothing;

insert into public.delivery_zones(id,restaurant_id,name,fee_cents) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Cercana',500),
('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Media',700),
('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Zona Demo',600)
on conflict (id) do nothing;
commit;
