begin;
-- Explicit deny policy documents the intended access model and resolves the
-- advisor's informational warning. Only the checked definer routine can write.
create policy "test access is server managed" on private.test_order_access
  for all to anon,authenticated using (false) with check (false);
commit;
