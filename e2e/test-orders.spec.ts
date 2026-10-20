import { test, expect, Page } from "@playwright/test";
const rid = "10000000-0000-4000-8000-000000000001",
  pid = "30000000-0000-4000-8000-000000000001",
  gid = "40000000-0000-4000-8000-000000000001",
  oid = "50000000-0000-4000-8000-000000000001",
  uid = "90000000-0000-4000-8000-000000000001";
const restaurant = {
  id: rid,
  slug: "brasa-norte",
  name: "Brasa Norte",
  phone: "900000000",
  opening_hours: "11:00 a 22:00",
  accepting_orders: false,
  published: true,
};
const product = {
  id: pid,
  restaurant_id: rid,
  category_id: "cat",
  name: "Pollo de prueba",
  description: "Pollo a la brasa con papas y ensalada.",
  price_cents: 1890,
  emoji: "🍗",
  tag: "",
  image_url: null,
  available: true,
  active: true,
  position: 0,
};
async function backend(page: Page, authorized = true) {
  let order: any = null;
  let history: any[] = [];
  let creates = 0;
  await page.addInitScript(
    ({ uid }) => {
      const enc = (s: string) =>
        btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      const payload = {
        sub: uid,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
      };
      localStorage.setItem(
        "sb-anrkxjythmkzttcypjmy-auth-token",
        JSON.stringify({
          access_token:
            enc('{"alg":"HS256"}') +
            "." +
            enc(JSON.stringify(payload)) +
            ".test",
          refresh_token: "fixture-only",
          expires_at: payload.exp,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: uid,
            role: "authenticated",
            email: "fixture@example.invalid",
          },
        }),
      );
    },
    { uid },
  );
  await page.route(
    "https://anrkxjythmkzttcypjmy.supabase.co/**",
    async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const body = route.request().postDataJSON();
      let data: any = [];
      if (path.includes("/auth/v1/user"))
        data = {
          id: uid,
          email: "fixture@example.invalid",
          role: "authenticated",
          app_metadata: {},
          user_metadata: {},
        };
      else if (path.endsWith("/restaurant_members"))
        data = [{ restaurant_id: rid, role: "owner" }];
      else if (path.endsWith("/restaurants"))
        data =
          url.searchParams.has("slug") ||
          route.request().headers()["accept"]?.includes("object")
            ? restaurant
            : [restaurant];
      else if (path.endsWith("/categories"))
        data = [
          {
            id: "cat",
            restaurant_id: rid,
            name: "Pollos a la brasa",
            active: true,
            position: 0,
          },
        ];
      else if (path.endsWith("/products")) data = [product];
      else if (path.endsWith("/product_option_groups"))
        data = [
          {
            id: gid,
            restaurant_id: rid,
            product_id: pid,
            name: "Acompañamiento",
            min_select: 1,
            max_select: 1,
            active: true,
            position: 0,
          },
        ];
      else if (path.endsWith("/product_options"))
        data = [
          {
            id: oid,
            restaurant_id: rid,
            group_id: gid,
            name: "Papas grandes",
            extra_price_cents: 300,
            active: true,
            position: 0,
          },
        ];
      else if (path.endsWith("/delivery_zones"))
        data = [{ id: "zone", name: "Zona cercana", fee_cents: 500 }];
      else if (path.endsWith("/rpc/test_orders_command")) {
        data =
          body.p_action === "access"
            ? { enabled: true, can_create: authorized, role: "owner" }
            : body.p_action === "summary"
              ? {
                  counts: order ? { [order.status]: 1 } : {},
                  total_cents: order?.total_cents ?? 0,
                  order_count: order ? 1 : 0,
                }
              : { enabled: true };
      } else if (path.endsWith("/functions/v1/test-orders")) {
        if (body.action === "create") {
          creates++;
          order = {
            id: "order",
            restaurant_id: rid,
            code: "TEST-00000000000000000000000000000001",
            status: "pendiente",
            is_test: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: uid,
            ...body.payload,
            total_cents: body.payload.expected_total_cents,
            subtotal_cents: 2190,
            delivery_fee_cents:
              body.payload.fulfillment === "delivery" ? 500 : 0,
            delivery_zone_name_snapshot: "Zona cercana",
          };
          history = [
            {
              id: "h1",
              new_status: "pendiente",
              actor_user_id: uid,
              created_at: new Date().toISOString(),
              reason: "",
            },
          ];
        } else {
          order = { ...order, status: body.payload.status };
          history.push({
            id: "h" + (history.length + 1),
            new_status: order.status,
            actor_user_id: uid,
            created_at: new Date().toISOString(),
            reason: body.payload.reason,
          });
        }
        data = { order };
      } else if (path.endsWith("/orders"))
        data = url.searchParams.has("id") ? order : order ? [order] : [];
      else if (path.endsWith("/order_items"))
        data = [
          {
            id: "item",
            product_name_snapshot: "Pollo de prueba",
            quantity: 1,
            unit_price_cents: 2190,
            line_total_cents: 2190,
            order_item_options: [
              { option_name_snapshot: "Papas grandes", extra_price_cents: 300 },
            ],
          },
        ];
      else if (path.endsWith("/order_status_history")) data = history;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "content-range": order ? "0-0/1" : "*/0",
          "access-control-expose-headers": "content-range",
        },
        body: JSON.stringify(data),
      });
    },
  );
  return { creates: () => creates };
}
async function startCheckout(page: Page) {
  await page.goto("/catalogo/brasa-norte");
  await page.getByRole("button", { name: /Papas grandes/ }).click();
  await page
    .getByRole("button", { name: "+ Añadir al carrito", exact: true })
    .click();
  await page.getByRole("button", { name: "Revisar pedido de prueba" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirmar simulación" }),
  ).toBeVisible();
}
test("pickup flow: validation, creation, staff acceptance and history", async ({
  page,
}, info) => {
  const fixture = await backend(page);
  await startCheckout(page);
  await page
    .getByRole("button", { name: "Confirmar pedido de prueba", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Confirma que");
  await page.getByLabel(/Confirmo que los datos/).check();
  await page.screenshot({
    path: `test-results/checkout-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirmar pedido de prueba", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido de prueba registrado" }),
  ).toBeVisible();
  expect(fixture.creates()).toBe(1);
  await page.getByRole("link", { name: "Ver pedidos en gestión" }).click();
  await page.getByRole("button", { name: "Ver y atender" }).click();
  await page
    .getByRole("button", { name: "Aceptar pedido", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar cambio" }).click();
  await expect(
    page.getByText(
      "Estado actualizado. El cambio quedó registrado en el historial.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comenzar preparación" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/orders-${info.project.name}.png`,
    fullPage: true,
  });
});
test("delivery selection, total and responsive layout", async ({ page }) => {
  await backend(page);
  await startCheckout(page);
  await page.getByLabel("Delivery de prueba", { exact: false }).first().check();
  await page.getByLabel("Zona de delivery").selectOption("zone");
  await expect(page.locator(".test-review-total")).toContainText("S/26.90");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel(/Confirmo que los datos/).check();
  await page
    .getByRole("button", { name: "Confirmar pedido de prueba", exact: true })
    .click();
  await expect(page.getByText("Total validado:")).toContainText("S/26.90");
});
test("unauthorized tester sees a clear restricted state", async ({ page }) => {
  await backend(page, false);
  await startCheckout(page);
  await expect(
    page.getByRole("heading", { name: "Pruebas reservadas al equipo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Confirmar pedido de prueba",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("public visitor cannot open management", async ({ page }) => {
  await page.goto("/gestion");
  await expect(page).toHaveURL(/\/ingresar/);
});
