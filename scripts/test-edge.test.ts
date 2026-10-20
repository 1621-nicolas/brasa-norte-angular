import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../supabase/functions/test-orders/handler.ts";
const restaurant_id = "10000000-0000-4000-8000-000000000001";
const body = { action: "create", restaurant_id, payload: {} };
const request = (value: unknown = body, headers: Record<string, string> = {}) =>
  new Request("https://example.test/test-orders", {
    method: "POST",
    headers: {
      authorization: "Bearer valid",
      "content-type": "application/json",
      origin: "http://localhost:4200",
      ...headers,
    },
    body: JSON.stringify(value),
  });
const ok = {
  user: async () => true,
  command: async () => ({ data: { id: "order" }, error: null }),
};
test("missing identity is rejected before the database", async () => {
  let calls = 0;
  const h = createHandler(
    {
      ...ok,
      command: async () => {
        calls++;
        return { data: null, error: null };
      },
    },
    ["http://localhost:4200"],
  );
  assert.equal((await h(request(body, { authorization: "" }))).status, 401);
  assert.equal(calls, 0);
});
test("invalid/revoked JWT rejected online", async () => {
  const h = createHandler({ ...ok, user: async () => false }, [
    "http://localhost:4200",
  ]);
  assert.equal((await h(request())).status, 401);
});
test("unknown origins cannot invoke the function", async () => {
  assert.equal((await createHandler(ok, [])(request())).status, 403);
});
test("rejects malformed shape, UUID and action", async () => {
  const h = createHandler(ok, ["http://localhost:4200"]);
  for (const value of [
    null,
    [],
    { ...body, restaurant_id: "other" },
    { ...body, action: "configure" },
    { ...body, price: 1 },
  ])
    assert.equal((await h(request(value))).status, 400);
});
test("stream limit applies without trusting content length", async () => {
  assert.equal(
    (
      await createHandler(ok, ["http://localhost:4200"])(
        request({ ...body, payload: "a".repeat(33000) }),
      )
    ).status,
    413,
  );
});
test("successful response has no-store and explicit CORS", async () => {
  const res = await createHandler(ok, ["http://localhost:4200"])(request());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(
    res.headers.get("access-control-allow-origin"),
    "http://localhost:4200",
  );
  assert.deepEqual(await res.json(), { order: { id: "order" } });
});
test("authorization, conflict and quota errors retain safe semantics", async () => {
  for (const [message, code, status] of [
    ["ACCESS_DENIED", "42501", 403],
    ["PRICE_CHANGED", "22023", 409],
    ["IDEMPOTENCY_CONFLICT", "23505", 409],
    ["TEST_RATE_LIMIT", "P0001", 429],
  ]) {
    const res = await createHandler(
      {
        ...ok,
        command: async () => ({
          data: null,
          error: { message: String(message), code: String(code) },
        }),
      },
      ["http://localhost:4200"],
    )(request());
    assert.equal(res.status, status);
  }
});
test("unexpected database details never reach client", async () => {
  const res = await createHandler(
    {
      ...ok,
      command: async () => ({
        data: null,
        error: { message: "secret query debug text", code: "XX000" },
      }),
    },
    ["http://localhost:4200"],
  )(request());
  assert.ok(!(await res.text()).includes("secret"));
});
test("preflight is limited to allowed origins", async () => {
  const res = await createHandler(ok, ["http://localhost:4200"])(
    new Request("https://example.test", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:4200" },
    }),
  );
  assert.equal(res.status, 204);
});
