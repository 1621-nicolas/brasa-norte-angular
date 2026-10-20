-- Rollback-only, generated synthetic fixtures; never relies on existing customers.
begin;
create function pg_temp.assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',label; end if; end $$;
create function pg_temp.reject(action text,rest uuid,payload jsonb,expected text) returns void language plpgsql as $$
begin
  perform public.test_orders_command(action,rest,payload);
  raise exception 'EXPECTED REJECTION: %',expected;
exception when others then
  if sqlerrm like 'EXPECTED REJECTION:%' or position(expected in sqlerrm)=0 then raise; end if;
end $$;
create temporary table fixtures(k text primary key,id uuid);
insert into fixtures select k,gen_random_uuid() from unnest(array['a','b','owner','staff','other','outsider','ca','cb','pa','pb','group','option','zone','zoneb','key']) k;
grant select,insert,update on fixtures to authenticated,anon;
insert into auth.users(id) select id from fixtures where k in ('owner','staff','other','outsider');
insert into public.restaurants(id,slug,name,published)
 select id,'test-'||id,'Restaurante ficticio',false from fixtures where k in ('a','b');
insert into public.restaurant_members(restaurant_id,user_id,role) values
 ((select id from fixtures where k='a'),(select id from fixtures where k='owner'),'owner'),
 ((select id from fixtures where k='a'),(select id from fixtures where k='staff'),'staff'),
 ((select id from fixtures where k='b'),(select id from fixtures where k='other'),'owner');
insert into public.categories(id,restaurant_id,name) values
 ((select id from fixtures where k='ca'),(select id from fixtures where k='a'),'Cat A'),
 ((select id from fixtures where k='cb'),(select id from fixtures where k='b'),'Cat B');
insert into public.products(id,restaurant_id,category_id,name,price_cents) values
 ((select id from fixtures where k='pa'),(select id from fixtures where k='a'),(select id from fixtures where k='ca'),'Pollo de prueba',1890),
 ((select id from fixtures where k='pb'),(select id from fixtures where k='b'),(select id from fixtures where k='cb'),'Producto B',500);
insert into public.product_option_groups(id,restaurant_id,product_id,name,min_select,max_select)
 values((select id from fixtures where k='group'),(select id from fixtures where k='a'),(select id from fixtures where k='pa'),'Acompañamiento',1,1);
insert into public.product_options(id,restaurant_id,group_id,name,extra_price_cents)
 values((select id from fixtures where k='option'),(select id from fixtures where k='a'),(select id from fixtures where k='group'),'Papas grandes',300);
insert into public.delivery_zones(id,restaurant_id,name,fee_cents) values
 ((select id from fixtures where k='zone'),(select id from fixtures where k='a'),'Zona de prueba',500),
 ((select id from fixtures where k='zoneb'),(select id from fixtures where k='b'),'Zona B',100);
create temporary table requests(payload jsonb);
insert into requests select jsonb_build_object(
 'idempotency_key',(select id from fixtures where k='key'),
 'customer_name','Cliente de prueba A','customer_phone','900000000','fulfillment','pickup',
 'delivery_zone_id',null,'delivery_address','','delivery_reference','','notes','Sin sal (prueba)',
 'expected_total_cents',4380,'simulation_confirmed',true,
 'items',jsonb_build_array(jsonb_build_object('product_id',(select id from fixtures where k='pa'),
 'quantity',2,'option_ids',jsonb_build_array((select id from fixtures where k='option')))));
grant select,update on requests to authenticated,anon;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from fixtures where k='owner'),true);
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload from requests),'TEST_ACCESS_REQUIRED');
select public.test_orders_command('configure',(select id from fixtures where k='a'),'{"enabled":true}');
select pg_temp.reject('create',(select id from fixtures where k='b'),(select payload from requests),'ACCESS_DENIED');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload||'{"total_cents":1}' from requests),'INVALID_INPUT');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload||'{"expected_total_cents":1}' from requests),'PRICE_CHANGED');
select pg_temp.assert((select count(*)=0 from public.orders),'failed price rolls back order and items');
select pg_temp.assert((select count(*)=0 from public.order_items),'atomic detail rollback');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,quantity}','21') from requests),'INVALID_ITEMS');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,quantity}','1.5') from requests),'INVALID_ITEMS');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,option_ids}','[]') from requests),'OPTION_BOUNDS');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,product_id}',to_jsonb((select id from fixtures where k='pb'))) from requests),'PRODUCT_UNAVAILABLE');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,option_ids}',jsonb_build_array(gen_random_uuid())) from requests),'OPTION_BOUNDS');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items,0,option_ids}',jsonb_build_array((select id from fixtures where k='option'),(select id from fixtures where k='option'))) from requests),'INVALID_OPTIONS');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items}',(payload->'items')||(payload->'items')) from requests),'DUPLICATE_COMBINATION');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload||jsonb_build_object('fulfillment','delivery','delivery_address','Dirección de prueba A','delivery_zone_id',(select id from fixtures where k='zoneb')) from requests),'INVALID_ZONE');
select pg_temp.reject(null,(select id from fixtures where k='a'),(select payload from requests),'INVALID_ACTION');
-- UUIDs are case-insensitive: equivalent spellings must not bypass the combination limit.
select pg_temp.reject('create',(select id from fixtures where k='a'),(select jsonb_set(payload,'{items}',(payload->'items')||jsonb_build_array(jsonb_set(payload->'items'->0,'{product_id}',to_jsonb(upper(payload->'items'->0->>'product_id'))))) from requests),'DUPLICATE_COMBINATION');
-- Simulate changed/hidden catalog, preserving all data through the outer rollback.
reset role;
update public.products set available=false where id=(select id from fixtures where k='pa');
set local role authenticated;
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload from requests),'PRODUCT_UNAVAILABLE');
reset role;
update public.products set available=true where id=(select id from fixtures where k='pa');
set local role authenticated;
insert into fixtures(k,id) select 'order',(public.test_orders_command('create',(select id from fixtures where k='a'),(select payload from requests))->>'id')::uuid;
select pg_temp.assert((select subtotal_cents=4380 and total_cents=4380 and is_test and payment_method='simulacion' and payment_status='no_aplica' from public.orders where id=(select id from fixtures where k='order')),'server pricing and test isolation');
select pg_temp.assert((select quantity=2 and unit_price_cents=2190 and line_total_cents=4380 and base_price_cents_snapshot=1890 from public.order_items),'item snapshots');
select pg_temp.assert((select option_name_snapshot='Papas grandes' and extra_price_cents=300 from public.order_item_options),'option snapshots');
select pg_temp.assert((public.test_orders_command('create',(select id from fixtures where k='a'),(select payload from requests))->>'replayed')::boolean,'same key replay');
select pg_temp.assert((select count(*)=1 from public.orders),'no duplicate');
select pg_temp.assert((select count(*)=1 from public.order_status_history),'one initial history event');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload||'{"notes":"Cambio"}' from requests),'IDEMPOTENCY_CONFLICT');
select pg_temp.assert(not has_table_privilege('authenticated','public.orders','INSERT'),'no direct inserts');
select pg_temp.assert(not has_column_privilege('authenticated','public.restaurants','accepting_orders','UPDATE'),'no commercial activation');
select pg_temp.assert(not has_function_privilege('anon','public.test_orders_command(text,uuid,jsonb)','EXECUTE'),'anonymous cannot call RPC');
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','pendiente','status','entregado'),'INVALID_TRANSITION');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where k='staff'),true);
select pg_temp.reject('configure',(select id from fixtures where k='a'),'{"enabled":false}','OWNER_REQUIRED');
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload||jsonb_build_object('idempotency_key',gen_random_uuid()) from requests),'TEST_ACCESS_REQUIRED');
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','pendiente','status','confirmado'));
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','pendiente','status','confirmado'));
select pg_temp.assert((select count(*)=2 from public.order_status_history),'transition retry no duplicate');
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','pendiente','status','preparando'),'STALE_ORDER');
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','confirmado','status','preparando'));
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','preparando','status','listo'));
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','listo','status','en_camino'),'INVALID_TRANSITION');
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','listo','status','entregado'));
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','entregado','status','cancelado','reason','Prueba'),'INVALID_TRANSITION');
select pg_temp.assert((select actor_user_id=(select id from fixtures where k='staff') from public.order_status_history where new_status='entregado'),'actor recorded');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where k='other'),true);
select pg_temp.assert((select count(*)=0 from public.orders),'B cannot read A orders');
select pg_temp.assert((select count(*)=0 from public.order_items),'B cannot read A items');
select pg_temp.assert((select count(*)=0 from public.order_item_options),'B cannot read A options');
select pg_temp.assert((select count(*)=0 from public.order_status_history),'B cannot read A history');
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'status','cancelado'),'ACCESS_DENIED');
select public.test_orders_command('configure',(select id from fixtures where k='b'),'{"enabled":true}');
select pg_temp.reject('transition',(select id from fixtures where k='b'),jsonb_build_object('order_id',(select id from fixtures where k='order'),'expected_status','entregado','status','cancelado'),'ORDER_NOT_FOUND');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where k='owner'),true);
select pg_temp.assert((select count(*)=0 from public.orders where not is_test),'commercial reports exclude simulations');
-- Delivery and cancellation.
update requests set payload=payload||jsonb_build_object('idempotency_key',gen_random_uuid(),'fulfillment','delivery',
  'delivery_address','Dirección de prueba A','delivery_zone_id',(select id from fixtures where k='zone'),'expected_total_cents',4880);
insert into fixtures(k,id) select 'delivery',(public.test_orders_command('create',(select id from fixtures where k='a'),(select payload from requests))->>'id')::uuid;
select pg_temp.assert((select delivery_fee_cents=500 and total_cents=4880 and delivery_zone_name_snapshot='Zona de prueba' from public.orders where id=(select id from fixtures where k='delivery')),'server delivery fee');
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='delivery'),'expected_status','pendiente','status','cancelado'),'CANCELLATION_REASON_REQUIRED');
select public.test_orders_command('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='delivery'),'expected_status','pendiente','status','cancelado','reason','Rechazo de prueba'));
select pg_temp.reject('transition',(select id from fixtures where k='a'),jsonb_build_object('order_id',(select id from fixtures where k='delivery'),'expected_status','cancelado','status','entregado'),'INVALID_TRANSITION');
select pg_temp.assert((public.test_orders_command('summary',(select id from fixtures where k='a'),'{}')->>'order_count')::int=2,'summary includes all tests');
select set_config('request.jwt.claim.sub',(select id::text from fixtures where k='outsider'),true);
select pg_temp.reject('summary',(select id from fixtures where k='a'),'{}','ACCESS_DENIED');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.reject('create',(select id from fixtures where k='a'),(select payload from requests),'AUTH_REQUIRED');
reset role;
rollback;
