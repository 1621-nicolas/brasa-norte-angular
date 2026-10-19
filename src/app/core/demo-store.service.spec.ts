import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoStoreService } from "./demo-store.service";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
    clear: () => data.clear(),
  };
};

describe("Brasa Norte · demostración local", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memory()));

  it("calcula productos, complementos y delivery sin redondeos inesperados", () => {
    const store = new DemoStoreService();
    expect(
      store.addToCart("p1", { acom: ["grandes"], extra: ["aji"] }, 2),
    ).toBe(true);
    expect(store.subtotal()).toBeCloseTo(45.8, 2);
    expect(store.checkoutTotal("delivery", "cercana")).toBeCloseTo(50.8, 2);
    expect(store.checkoutTotal("pickup", "cercana")).toBeCloseTo(45.8, 2);
  });

  it("rechaza productos agotados y opciones obligatorias ausentes", () => {
    const store = new DemoStoreService();
    expect(store.addToCart("p1", {}, 1)).toBe(false);
    store.toggleProduct("p1");
    expect(store.addToCart("p1", { acom: ["papas"], extra: [] }, 1)).toBe(
      false,
    );
  });

  it("crea una orden ficticia y solo permite transiciones válidas", () => {
    const store = new DemoStoreService();
    store.addToCart("p8", {}, 1);
    const order = store.createDemoOrder({
      customer: "Cliente Ficticio",
      phone: "900000000",
      fulfillment: "pickup",
      zone: "cercana",
      address: "",
      payment: "efectivo",
      notes: "",
    });
    expect(store.cartCount()).toBe(0);
    expect(order.status).toBe("pendiente");
    expect(store.changeOrderStatus(order.id, "entregado")).toBe(false);
    expect(store.changeOrderStatus(order.id, "confirmado")).toBe(true);
    expect(store.changeOrderStatus(order.id, "preparando")).toBe(true);
    expect(store.changeOrderStatus(order.id, "listo")).toBe(true);
    expect(store.changeOrderStatus(order.id, "entregado")).toBe(true);
  });

  it("no crea pedidos si el restaurante está pausado", () => {
    const store = new DemoStoreService();
    store.addToCart("p8", {}, 1);
    store.saveSettings({ ...store.settings(), acceptsOrders: false });
    expect(() =>
      store.createDemoOrder({
        customer: "Cliente",
        phone: "900000000",
        fulfillment: "pickup",
        zone: "cercana",
        address: "",
        payment: "efectivo",
        notes: "",
      }),
    ).toThrow();
  });
});
