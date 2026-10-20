import { describe, it, expect } from "vitest";
import {
  checkoutErrors,
  money,
  nextTestStatus,
  canCancelTestOrder,
  orderPayload,
  TestCheckout,
} from "./test-orders.models";
import { CatalogCartLine } from "./catalog-cart.service";
const form: TestCheckout = {
  customer_name: "Cliente de prueba A",
  customer_phone: "900000000",
  fulfillment: "pickup",
  delivery_zone_id: "",
  delivery_address: "",
  delivery_reference: "",
  notes: "",
  simulation_confirmed: true,
};
const line: CatalogCartLine = {
  id: "line",
  restaurantId: "rest",
  productId: "prod",
  name: "Pollo",
  emoji: "",
  imageUrl: null,
  quantity: 2,
  basePriceCents: 1890,
  options: [],
  signature: "",
  unitPriceCents: 1890,
};
describe("checkout and order rules", () => {
  it("validates consent, sample data and empty cart", () => {
    expect(checkoutErrors(form, [], [line])).toEqual([]);
    expect(
      checkoutErrors({ ...form, simulation_confirmed: false }, [], [line]),
    ).toHaveLength(1);
    expect(
      checkoutErrors({ ...form, customer_phone: "999999999" }, [], [line]),
    ).toHaveLength(1);
    expect(checkoutErrors(form, [], [])).toHaveLength(1);
  });
  it("requires an active zone and sample address for delivery", () => {
    expect(
      checkoutErrors({ ...form, fulfillment: "delivery" }, [], [line]),
    ).toHaveLength(2);
    expect(
      checkoutErrors(
        {
          ...form,
          fulfillment: "delivery",
          delivery_address: "Dirección de prueba A",
          delivery_zone_id: "zone",
        },
        [{ id: "zone", name: "Zona", fee_cents: 500 }],
        [line],
      ),
    ).toEqual([]);
  });
  it("sends identifiers and quantities without trusting cart prices", () => {
    const payload = orderPayload(form, [line], "key", 3780);
    expect(payload.items[0]).toEqual({
      product_id: "prod",
      quantity: 2,
      option_ids: [],
    });
    expect(payload.delivery_zone_id).toBeNull();
    expect(payload).not.toHaveProperty("subtotal_cents");
  });
  it("handles pickup/delivery transitions and terminal states", () => {
    expect(nextTestStatus({ status: "listo", fulfillment: "pickup" })).toBe(
      "entregado",
    );
    expect(nextTestStatus({ status: "listo", fulfillment: "delivery" })).toBe(
      "en_camino",
    );
    for (const status of ["entregado", "cancelado"] as const) {
      expect(nextTestStatus({ status, fulfillment: "pickup" })).toBeNull();
      expect(canCancelTestOrder(status)).toBe(false);
    }
  });
  it("formats cents without rounding drift", () => {
    expect(money(2190)).toBe("S/21.90");
    expect(money(0)).toBe("S/0.00");
  });
});
