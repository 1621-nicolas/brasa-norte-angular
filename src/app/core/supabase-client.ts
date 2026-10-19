import { createClient } from '@supabase/supabase-js';

/**
 * Supabase publishable key: es PUBLICA y debe estar en el frontend.
 * NO introducir nunca service_role, secret keys ni contraseñas aquí.
 * La seguridad efectiva está en PostgreSQL RLS y el backend.
 */
export const supabase = createClient(
  'https://anrkxjythmkzttcypjmy.supabase.co',
  'sb_publishable_kACnoYeAarlo_V-gCufI1g_sp6CDaN3',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
