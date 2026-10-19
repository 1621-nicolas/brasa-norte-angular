import { Injectable, computed, signal } from "@angular/core";
import {
  CartLine,
  Checkout,
  Choices,
  DEFAULT_PRODUCTS,
  DEFAULT_SETTINGS,
  Order,
  OrderLine,
  OrderStatus,
  Product,
  Settings,
  STATUS_NEXT,
} from "./models";

const PREFIX = "brasanorte_angular_demo_v1_";
const clone = <T>(value: T): T => structuredClone(value);
const uid = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** SOLO PARA DEMOSTRACIONES. No persistir datos personales auténticos. */
@Injectable({ providedIn: "root" })
export class DemoStoreService {
  readonly products = signal<Product[]>(
    this.load("products", DEFAULT_PRODUCTS),
  );
  readonly settings = signal<Settings>(this.load("settings", DEFAULT_SETTINGS));
  readonly cart = signal<CartLine[]>(this.load("cart", [] as CartLine[]));
  readonly orders = signal<Order[]>(this.load("orders", [] as Order[]));
  readonly cartOpen = signal(false);
  readonly cartCount = computed(() =>
    this.cart().reduce((sum, line) => sum + line.qty, 0),
  );
  readonly subtotal = computed(() =>
    this.cart().reduce((sum, line) => sum + this.lineTotal(line), 0),
  );

  private load<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(PREFIX + key);
      return saved ? (JSON.parse(saved) as T) : clone(fallback);
    } catch {
      return clone(fallback);
    }
  }
  private persist<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      console.warn("No se pudo almacenar esta demostración.");
    }
  }

  product(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }
  choicesValid(product: Product, choices: Choices): boolean {
    return product.groups.every((g) => {
      const selected = choices[g.id] ?? [];
      return (
        selected.length >= g.min &&
        selected.length <= g.max &&
        new Set(selected).size === selected.length &&
        selected.every((id) => g.options.some((o) => o.id === id))
      );
    });
  }
  selectedOptions(
    product: Product,
    choices: Choices,
  ): { name: string; price: number }[] {
    return product.groups.flatMap((g) =>
      (choices[g.id] ?? []).flatMap((id) => {
        const option = g.options.find((o) => o.id === id);
        return option ? [{ name: option.name, price: option.price }] : [];
      }),
    );
  }
  unitPrice(product: Product, choice: Choices): number {
    return (
      product.price +
      this.selectedOptions(product, choice).reduce(
        (sum, option) => sum + option.price,
        0,
      )
    );
  }
  lineTotal(line: CartLine): number {
    const product = this.product(line.pid);
    return product ? this.unitPrice(product, line.choice) * line.qty : 0;
  }
  addToCart(productId: string, choice: Choices, qty: number): boolean {
    const product = this.product(productId);
    if (
      !product?.available ||
      !this.choicesValid(product, choice) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 20
    )
      return false;
    const lines = clone(this.cart());
    const existing = lines.find(
      (x) =>
        x.pid === productId &&
        JSON.stringify(x.choice) === JSON.stringify(choice),
    );
    if (existing) existing.qty = Math.min(20, existing.qty + qty);
    else
      lines.push({ lineId: uid(), pid: productId, choice: clone(choice), qty });
    this.cart.set(lines);
    this.persist("cart", lines);
    return true;
  }
  changeQuantity(lineId: string, delta: number): void {
    const result = this.cart().map((line) =>
      line.lineId === lineId
        ? { ...line, qty: Math.max(1, Math.min(20, line.qty + delta)) }
        : line,
    );
    this.cart.set(result);
    this.persist("cart", result);
  }
  removeLine(lineId: string): void {
    const result = this.cart().filter((line) => line.lineId !== lineId);
    this.cart.set(result);
    this.persist("cart", result);
  }
  deliveryFee(method: Checkout["fulfillment"], zone: string): number {
    return method === "pickup" ? 0 : (this.settings().fees[zone] ?? NaN);
  }
  checkoutTotal(method: Checkout["fulfillment"], zone: string): number {
    return this.subtotal() + this.deliveryFee(method, zone);
  }

  /** Se valida de nuevo el precio/stock. No sustituye a la validación real en el servidor. */
  createDemoOrder(checkout: Checkout): Order {
    if (!this.settings().acceptsOrders)
      throw Error("El restaurante ha pausado sus pedidos.");
    if (this.cart().length === 0) throw Error("Tu carrito está vacío.");
    if (!checkout.customer.trim() || !/^\d{9}$/.test(checkout.phone))
      throw Error("Completa el nombre y un teléfono ficticio de 9 dígitos.");
    if (
      checkout.fulfillment === "delivery" &&
      (!checkout.address.trim() ||
        !Number.isFinite(this.deliveryFee("delivery", checkout.zone)))
    )
      throw Error("Revisa la dirección y zona de entrega.");
    const items: OrderLine[] = this.cart().map((line) => {
      const product = this.product(line.pid);
      if (!product?.available || !this.choicesValid(product, line.choice))
        throw Error("Un producto no está disponible. Revisa tu carrito.");
      if (line.qty < 1 || line.qty > 20)
        throw Error("Cantidad de productos no válida.");
      const unitPrice = this.unitPrice(product, line.choice);
      return {
        productName: product.name,
        unitPrice,
        qty: line.qty,
        options: this.selectedOptions(product, line.choice),
        total: Math.round(unitPrice * line.qty * 100) / 100,
      };
    });
    const subtotal =
      Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
    const deliveryFee = this.deliveryFee(checkout.fulfillment, checkout.zone);
    const order: Order = {
      id: uid(),
      code: `BN-${Date.now().toString().slice(-7)}`,
      createdAt: new Date().toISOString(),
      customer: checkout.customer.trim(),
      phone: checkout.phone,
      fulfillment: checkout.fulfillment,
      zone: checkout.fulfillment === "pickup" ? "" : checkout.zone,
      address: checkout.fulfillment === "pickup" ? "" : checkout.address.trim(),
      payment: checkout.payment,
      notes: checkout.notes.trim(),
      subtotal,
      deliveryFee,
      total: Math.round((subtotal + deliveryFee) * 100) / 100,
      items,
      status: "pendiente",
      history: [{ status: "pendiente", at: new Date().toISOString() }],
    };
    this.orders.update((orders) => [order, ...orders]);
    this.persist("orders", this.orders());
    this.cart.set([]);
    this.persist("cart", []);
    return order;
  }

  changeOrderStatus(id: string, next: OrderStatus): boolean {
    const order = this.orders().find((o) => o.id === id);
    if (!order) return false;
    const allowed =
      STATUS_NEXT[order.status] === next ||
      (order.status === "listo" &&
        order.fulfillment === "pickup" &&
        next === "entregado") ||
      (["pendiente", "confirmado"].includes(order.status) &&
        next === "cancelado");
    if (!allowed) return false;
    const updated = this.orders().map((o) =>
      o.id === id
        ? {
            ...o,
            status: next,
            history: [
              ...o.history,
              { status: next, at: new Date().toISOString() },
            ],
          }
        : o,
    );
    this.orders.set(updated);
    this.persist("orders", updated);
    return true;
  }
  saveProduct(input: Product): void {
    if (
      !input.name.trim() ||
      !Number.isFinite(input.price) ||
      input.price < 0.5 ||
      input.price > 999.99
    )
      throw Error("Revisa nombre y precio.");
    const product = {
      ...clone(input),
      name: input.name.trim(),
      price: Math.round(input.price * 100) / 100,
    };
    const exists = this.product(input.id);
    const result = exists
      ? this.products().map((p) => (p.id === input.id ? product : p))
      : [...this.products(), product];
    this.products.set(result);
    this.persist("products", result);
  }
  toggleProduct(id: string): void {
    const result = this.products().map((p) =>
      p.id === id ? { ...p, available: !p.available } : p,
    );
    this.products.set(result);
    this.persist("products", result);
  }
  saveSettings(settings: Settings): void {
    if (
      !settings.name.trim() ||
      !/^\d{9,12}$/.test(settings.phone) ||
      Object.values(settings.fees).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 99,
      )
    )
      throw Error("Revisa la configuración y tarifas.");
    this.settings.set(clone(settings));
    this.persist("settings", this.settings());
  }
  reset(): void {
    for (const key of ["products", "settings", "cart", "orders"]) {
      try {
        localStorage.removeItem(PREFIX + key);
      } catch {}
    }
    this.products.set(clone(DEFAULT_PRODUCTS));
    this.settings.set(clone(DEFAULT_SETTINGS));
    this.cart.set([]);
    this.orders.set([]);
    this.cartOpen.set(false);
  }
}
