-- V0.8: additive, restricted test orders. No existing rows are classified as tests.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter table public.restaurants add column test_orders_enabled boolean not null default false;
-- Commercial activation is not part of V0.8 (including hand-crafted REST requests).
revoke update (accepting_orders) on public.restaurants from authenticated;
alter table public.orders
  add column is_test boolean not null default false,
  add column created_by uuid references auth.users(id),
  add column request_payload jsonb,
  add column delivery_zone_name_snapshot text not null default '',
  add column delivery_reference text not null default '',
  add column updated_at timestamptz not null default now();
-- Expand old payment constraints without rewriting existing data.
alter table public.orders drop constraint orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('efectivo','yape','simulacion'));
alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pendiente','verificado','no_aplica'));
alter table public.orders add constraint orders_test_invariants check (
  (not is_test and payment_method <> 'simulacion' and payment_status <> 'no_aplica') or
  (is_test and payment_method = 'simulacion' and payment_status = 'no_aplica'
    and created_by is not null and request_payload is not null
    and customer_phone = '900000000' and code like 'TEST-%')
);
alter table public.order_items add column base_price_cents_snapshot integer
  check (base_price_cents_snapshot is null or base_price_cents_snapshot >= 0);
alter table public.order_item_options
  add column option_id_snapshot uuid,
  add column group_name_snapshot text not null default '';
alter table public.order_status_history add column reason text not null default ''
  check (char_length(reason) <= 300);
create index orders_test_status_created_idx on public.orders(restaurant_id,is_test,status,created_at desc,id);
create index orders_creator_created_idx on public.orders(created_by,created_at desc) where is_test;
create index order_options_item_idx on public.order_item_options(restaurant_id,order_item_id);
create index history_actor_idx on public.order_status_history(actor_user_id);

create table private.test_order_access (
  restaurant_id uuid not null,
  user_id uuid not null,
  primary key (restaurant_id,user_id),
  foreign key (restaurant_id,user_id) references public.restaurant_members(restaurant_id,user_id) on delete cascade
);
alter table private.test_order_access enable row level security;
revoke all on private.test_order_access from public,anon,authenticated;

-- This is the only privileged entry point. All private operations check the live
-- membership, never user_metadata. The public API wrapper below is INVOKER.
create function private.test_orders_command(p_action text,p_restaurant_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); member_role text; enabled boolean; allowed boolean;
  req jsonb := coalesce(p_payload,'{}'::jsonb); line jsonb; option_ids uuid[];
  prod public.products%rowtype; grp public.product_option_groups%rowtype;
  opt public.product_options%rowtype; zone public.delivery_zones%rowtype;
  ord public.orders%rowtype; item_id uuid; new_id uuid; key_id uuid;
  amount bigint := 0; unit_amount bigint; fee integer := 0; qty integer;
  selected_count integer; valid_count integer; seen text[] := '{}'; signature text;
  next_status text; expected_status text; reason text; output jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select m.role into member_role from public.restaurant_members m
    where m.restaurant_id=p_restaurant_id and m.user_id=actor;
  if member_role is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select r.test_orders_enabled into enabled from public.restaurants r where r.id=p_restaurant_id;
  select exists(select 1 from private.test_order_access a
    where a.restaurant_id=p_restaurant_id and a.user_id=actor) into allowed;
  if jsonb_typeof(req) <> 'object' or octet_length(req::text)>32768 then
    raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if p_action='access' then
    return jsonb_build_object('enabled',enabled,'can_create',enabled and allowed,'role',member_role);
  end if;
  if p_action='configure' then
    if member_role <> 'owner' then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
    if jsonb_typeof(req->'enabled') is distinct from 'boolean' then
      raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    update public.restaurants set test_orders_enabled=(req->>'enabled')::boolean where id=p_restaurant_id;
    if (req->>'enabled')::boolean then
      insert into private.test_order_access values (p_restaurant_id,actor) on conflict do nothing;
    end if;
    return jsonb_build_object('enabled',(req->>'enabled')::boolean);
  end if;
  if p_action='authorize' then
    if member_role <> 'owner' then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
    if jsonb_typeof(req->'enabled') is distinct from 'boolean' or not exists (
      select 1 from public.restaurant_members where restaurant_id=p_restaurant_id and user_id=(req->>'user_id')::uuid
    ) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    if (req->>'enabled')::boolean then
      insert into private.test_order_access values(p_restaurant_id,(req->>'user_id')::uuid) on conflict do nothing;
    else
      delete from private.test_order_access where restaurant_id=p_restaurant_id and user_id=(req->>'user_id')::uuid;
    end if;
    return jsonb_build_object('ok',true);
  end if;
  if p_action='summary' then
    select jsonb_build_object('counts',coalesce(jsonb_object_agg(s.status,s.n),'{}'::jsonb),
      'total_cents',coalesce(sum(s.total),0),'order_count',coalesce(sum(s.n),0)) into output
    from (select status,count(*) n,sum(total_cents) total from public.orders
      where restaurant_id=p_restaurant_id and is_test group by status) s;
    return output;
  end if;
  if p_action='transition' then
    if not enabled then raise exception 'TEST_MODE_DISABLED' using errcode='42501'; end if;
    next_status := req->>'status'; expected_status := req->>'expected_status'; reason:=btrim(coalesce(req->>'reason',''));
    if next_status is null or expected_status is null or char_length(reason)>300 then
      raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    select * into ord from public.orders where id=(req->>'order_id')::uuid
      and restaurant_id=p_restaurant_id and is_test for update;
    if not found then raise exception 'ORDER_NOT_FOUND' using errcode='42501'; end if;
    -- Retries are harmless and never append duplicate history.
    if ord.status=next_status then return to_jsonb(ord)-'request_payload'; end if;
    if ord.status <> expected_status then raise exception 'STALE_ORDER' using errcode='40001'; end if;
    if not (
      (ord.status='pendiente' and next_status in ('confirmado','cancelado')) or
      (ord.status='confirmado' and next_status in ('preparando','cancelado')) or
      (ord.status='preparando' and next_status in ('listo','cancelado')) or
      (ord.status='listo' and next_status=case when ord.fulfillment='pickup' then 'entregado' else 'en_camino' end) or
      (ord.status='en_camino' and next_status='entregado')
    ) then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
    if next_status='cancelado' and char_length(reason)<3 then
      raise exception 'CANCELLATION_REASON_REQUIRED' using errcode='22023'; end if;
    update public.orders set status=next_status,updated_at=clock_timestamp() where id=ord.id returning * into ord;
    insert into public.order_status_history(restaurant_id,order_id,actor_user_id,old_status,new_status,reason)
      values(p_restaurant_id,ord.id,actor,expected_status,next_status,reason);
    return to_jsonb(ord)-'request_payload';
  end if;
  if p_action <> 'create' then raise exception 'INVALID_ACTION' using errcode='22023'; end if;
  if not enabled or not allowed then raise exception 'TEST_ACCESS_REQUIRED' using errcode='42501'; end if;
  if exists(select 1 from jsonb_object_keys(req) k where k not in
    ('idempotency_key','customer_name','customer_phone','fulfillment','delivery_zone_id','delivery_address',
      'delivery_reference','notes','items','expected_total_cents','simulation_confirmed'))
    or req->'simulation_confirmed' is distinct from 'true'::jsonb
    or coalesce(req->>'customer_name','') !~ '^Cliente de prueba [A-Za-z0-9 -]{1,40}$'
    or req->>'customer_phone' is distinct from '900000000'
    or coalesce(req->>'fulfillment','') not in ('pickup','delivery')
    or char_length(coalesce(req->>'notes',''))>1000
    or char_length(coalesce(req->>'delivery_reference',''))>300
    or coalesce(req->>'expected_total_cents','') !~ '^[0-9]{1,9}$'
    or jsonb_typeof(req->'items') is distinct from 'array' then
    raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if jsonb_array_length(req->'items') not between 1 and 25 then
    raise exception 'INVALID_ITEMS' using errcode='22023'; end if;
  key_id := (req->>'idempotency_key')::uuid;
  if key_id is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  -- One transaction per restaurant: duplicate retries and quotas stay atomic.
  perform pg_advisory_xact_lock(hashtextextended(p_restaurant_id::text,8));
  select * into ord from public.orders where restaurant_id=p_restaurant_id and idempotency_key=key_id;
  if found then
    if not ord.is_test or ord.created_by<>actor or ord.request_payload<>req then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
    return (to_jsonb(ord)-'request_payload') || jsonb_build_object('replayed',true);
  end if;
  if (select count(*) from public.orders where restaurant_id=p_restaurant_id and is_test
      and created_at>now()-interval '24 hours')>=200 or
     (select count(*) from public.orders where restaurant_id=p_restaurant_id and created_by=actor and is_test
      and created_at>now()-interval '1 hour')>=30 then
    raise exception 'TEST_RATE_LIMIT' using errcode='P0001'; end if;
  if req->>'fulfillment'='delivery' then
    if coalesce(req->>'delivery_address','') !~ '^Dirección de prueba .{1,120}$' then
      raise exception 'INVALID_ADDRESS' using errcode='22023'; end if;
    select * into zone from public.delivery_zones where id=(req->>'delivery_zone_id')::uuid
      and restaurant_id=p_restaurant_id and active for share;
    if not found then raise exception 'INVALID_ZONE' using errcode='22023'; end if;
    fee:=zone.fee_cents;
  elsif coalesce(req->>'delivery_zone_id','')<>'' or coalesce(req->>'delivery_address','')<>'' then
    raise exception 'INVALID_PICKUP' using errcode='22023';
  end if;
  new_id := gen_random_uuid();
  insert into public.orders(id,restaurant_id,code,idempotency_key,customer_name,customer_phone,
    fulfillment,delivery_zone_id,delivery_address,delivery_reference,delivery_zone_name_snapshot,
    notes,payment_method,payment_status,subtotal_cents,delivery_fee_cents,is_test,created_by,request_payload)
  values(new_id,p_restaurant_id,'TEST-'||replace(new_id::text,'-',''),key_id,
    req->>'customer_name','900000000',req->>'fulfillment',zone.id,coalesce(req->>'delivery_address',''),
    coalesce(req->>'delivery_reference',''),coalesce(zone.name,''),coalesce(req->>'notes',''),
    'simulacion','no_aplica',0,fee,true,actor,req);
  for line in select value from jsonb_array_elements(req->'items') loop
    if jsonb_typeof(line)<>'object' or exists(select 1 from jsonb_object_keys(line) k
       where k not in ('product_id','quantity','option_ids'))
       or jsonb_typeof(line->'quantity') is distinct from 'number'
       or coalesce(line->>'quantity','') !~ '^[0-9]{1,2}$'
       or jsonb_typeof(line->'option_ids') is distinct from 'array' then
      raise exception 'INVALID_ITEMS' using errcode='22023'; end if;
    qty:=(line->>'quantity')::integer;
    if qty not between 1 and 20 or jsonb_array_length(line->'option_ids')>50 then
      raise exception 'INVALID_ITEMS' using errcode='22023'; end if;
    select coalesce(array_agg(value::uuid order by value),'{}'::uuid[]) into option_ids
      from jsonb_array_elements_text(line->'option_ids');
    if cardinality(option_ids)<>(select count(distinct x) from unnest(option_ids) x) then
      raise exception 'INVALID_OPTIONS' using errcode='22023'; end if;
    signature := (line->>'product_id') || ':' || option_ids::text;
    if signature=any(seen) then raise exception 'DUPLICATE_COMBINATION' using errcode='22023'; end if;
    seen:=array_append(seen,signature);
    select p.* into prod from public.products p join public.categories c
      on c.id=p.category_id and c.restaurant_id=p.restaurant_id
      where p.id=(line->>'product_id')::uuid and p.restaurant_id=p_restaurant_id
      and p.active and p.available and c.active for share of p,c;
    if not found then raise exception 'PRODUCT_UNAVAILABLE' using errcode='22023'; end if;
    unit_amount:=prod.price_cents; valid_count:=0;
    -- Validate each current active group, including mandatory groups with zero choices.
    for grp in select * from public.product_option_groups where restaurant_id=p_restaurant_id
      and product_id=prod.id and active order by id for share loop
      selected_count:=0;
      for opt in select * from public.product_options where restaurant_id=p_restaurant_id
        and group_id=grp.id and active and id=any(option_ids) order by id for share loop
        unit_amount:=unit_amount+opt.extra_price_cents;
        selected_count:=selected_count+1;
      end loop;
      if selected_count<grp.min_select or selected_count>grp.max_select then
        raise exception 'OPTION_BOUNDS' using errcode='22023'; end if;
      valid_count:=valid_count+selected_count;
    end loop;
    if valid_count<>cardinality(option_ids) then raise exception 'INVALID_OPTIONS' using errcode='22023'; end if;
    amount:=amount+unit_amount*qty;
    if amount+fee>1000000 then raise exception 'ORDER_TOO_LARGE' using errcode='22023'; end if;
    item_id:=gen_random_uuid();
    insert into public.order_items(id,restaurant_id,order_id,product_id,product_name_snapshot,
      quantity,unit_price_cents,line_total_cents,base_price_cents_snapshot)
      values(item_id,p_restaurant_id,new_id,prod.id,prod.name,qty,unit_amount,unit_amount*qty,prod.price_cents);
    insert into public.order_item_options(restaurant_id,order_item_id,option_name_snapshot,
      extra_price_cents,option_id_snapshot,group_name_snapshot)
      select p_restaurant_id,item_id,o.name,o.extra_price_cents,o.id,g.name
        from public.product_options o join public.product_option_groups g on g.id=o.group_id
        where o.restaurant_id=p_restaurant_id and o.id=any(option_ids);
  end loop;
  if (req->>'expected_total_cents')::bigint<>amount+fee then
    raise exception 'PRICE_CHANGED' using errcode='22023'; end if;
  update public.orders set subtotal_cents=amount where id=new_id returning * into ord;
  insert into public.order_status_history(restaurant_id,order_id,actor_user_id,old_status,new_status)
    values(p_restaurant_id,new_id,actor,null,'pendiente');
  return (to_jsonb(ord)-'request_payload') || jsonb_build_object('replayed',false);
end $$;
revoke all on function private.test_orders_command(text,uuid,jsonb) from public,anon;
grant execute on function private.test_orders_command(text,uuid,jsonb) to authenticated;
create function public.test_orders_command(p_action text,p_restaurant_id uuid,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.test_orders_command(p_action,p_restaurant_id,p_payload);
$$;
revoke all on function public.test_orders_command(text,uuid,jsonb) from public,anon;
grant execute on function public.test_orders_command(text,uuid,jsonb) to authenticated;
-- Private order tables remain read-only for clients; existing tenant RLS applies.
revoke insert,update,delete on public.orders,public.order_items,public.order_item_options,public.order_status_history from anon,authenticated;
comment on column public.orders.is_test is 'Always filter is_test=false in any future commercial report.';
commit;
