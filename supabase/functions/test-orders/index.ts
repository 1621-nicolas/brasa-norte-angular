import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const key = keys["default"] ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const client = (token: string) =>
  createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
// verify_jwt=false is required for new signing keys. Every call is verified
// online with Auth.getUser; SQL independently checks auth.uid and membership.
Deno.serve(
  createHandler(
    {
      async user(token) {
        const { data, error } = await client(token).auth.getUser(token);
        return !error && !!data.user && !data.user.is_anonymous;
      },
      async command(token, action, restaurantId, payload) {
        return await client(token).rpc("test_orders_command", {
          p_action: action,
          p_restaurant_id: restaurantId,
          p_payload: payload,
        });
      },
    },
    (
      Deno.env.get("TEST_ORDER_ALLOWED_ORIGINS") ??
      "http://localhost:4200,http://127.0.0.1:4200"
    )
      .split(",")
      .map((s) => s.trim()),
  ),
);
