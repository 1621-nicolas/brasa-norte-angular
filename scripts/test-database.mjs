import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const db = new PGlite();
try {
  // Disposable PostgreSQL/WASM. Only Supabase-owned auth/storage objects are stubbed;
  // application migrations, constraints, RLS and PL/pgSQL run unchanged.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,name text,bucket_id text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as 'select string_to_array(regexp_replace($1,''/[^/]+$'',''''),''/'')';
    create function storage.extension(text) returns text language sql as 'select substring($1 from ''[^.]+$'')';
  `);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    console.log(`Applied ${file}`);
  }
  await db.exec(await readFile("supabase/tests/test_orders.sql", "utf8"));
  console.log(
    "PASS: PostgreSQL transaction, pricing, RLS, tenants, roles, idempotency and state assertions.",
  );
} catch (error) {
  console.error("FAIL:", error.message, "SQLSTATE:", error.code ?? "unknown");
  process.exitCode = 1;
} finally {
  await db.close();
}
