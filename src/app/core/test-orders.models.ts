import { Fulfillment, OrderStatus } from "./models";
import { CatalogCartLine } from "./catalog-cart.service";
export interface DeliveryZone {
  id: string;
  name: string;
  fee_cents: number;
}
export interface TestAccess {
  enabled: boolean;
  can_create: boolean;
  role: "owner" | "manager" | "staff";
}
export interface TestCheckout {
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  delivery_zone_id: string;
  delivery_address: string;
  delivery_reference: string;
  notes: string;
  simulation_confirmed: boolean;
}
export interface TestOrder {
  id: string;
  restaurant_id: string;
  code: string;
  status: OrderStatus;
  is_test: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  delivery_address: string;
  delivery_reference: string;
  delivery_zone_name_snapshot: string;
  notes: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
}
export interface TestOrderItem {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  order_item_options: {
    option_name_snapshot: string;
    extra_price_cents: number;
  }[];
}
export interface TestOrderHistory {
  id: string;
  actor_user_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  reason: string;
  created_at: string;
}
export interface OrderDetail {
  order: TestOrder;
  items: TestOrderItem[];
  history: TestOrderHistory[];
}
export interface OrderSummary {
  counts: Partial<Record<OrderStatus, number>>;
  total_cents: number;
  order_count: number;
}
export const TEST_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Nuevos",
  confirmado: "Confirmados",
  preparando: "Preparando",
  listo: "Listos",
  en_camino: "En camino",
  entregado: "Finalizados",
  cancelado: "Cancelados",
};
export const TEST_STATUSES = Object.keys(TEST_STATUS_LABELS) as OrderStatus[];
export function nextTestStatus(
  order: Pick<TestOrder, "status" | "fulfillment">,
): OrderStatus | null {
  switch (order.status) {
    case "pendiente":
      return "confirmado";
    case "confirmado":
      return "preparando";
    case "preparando":
      return "listo";
    case "listo":
      return order.fulfillment === "pickup" ? "entregado" : "en_camino";
    case "en_camino":
      return "entregado";
    default:
      return null;
  }
}
export function canCancelTestOrder(status: OrderStatus): boolean {
  return ["pendiente", "confirmado", "preparando"].includes(status);
}
export function money(cents: number): string {
  return "S/" + (cents / 100).toFixed(2);
}
export function checkoutErrors(
  form: TestCheckout,
  zones: DeliveryZone[],
  lines: CatalogCartLine[],
): string[] {
  const errors: string[] = [];
  if (!/^Cliente de prueba [A-Za-z0-9 -]{1,40}$/.test(form.customer_name))
    errors.push("Selecciona un cliente ficticio.");
  if (form.customer_phone !== "900000000")
    errors.push("Usa el teléfono reservado para pruebas.");
  if (!["pickup", "delivery"].includes(form.fulfillment))
    errors.push("Selecciona recojo o delivery.");
  if (form.fulfillment === "delivery") {
    if (!zones.some((z) => z.id === form.delivery_zone_id))
      errors.push("Selecciona una zona de delivery.");
    if (!/^Dirección de prueba .{1,120}$/.test(form.delivery_address))
      errors.push("Selecciona una dirección ficticia.");
  }
  if (form.notes.length > 1000 || form.delivery_reference.length > 300)
    errors.push("Reduce la longitud de las observaciones.");
  if (!lines.length) errors.push("Añade al menos un producto al carrito.");
  if (
    lines.length > 25 ||
    lines.some(
      (l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 20,
    )
  )
    errors.push("Revisa las cantidades y el máximo de 25 combinaciones.");
  if (!form.simulation_confirmed)
    errors.push(
      "Confirma que la información es ficticia y no se realizará una venta.",
    );
  return errors;
}
export function orderPayload(
  form: TestCheckout,
  lines: CatalogCartLine[],
  key: string,
  total: number,
) {
  return {
    ...form,
    idempotency_key: key,
    expected_total_cents: total,
    delivery_zone_id:
      form.fulfillment === "delivery" ? form.delivery_zone_id : null,
    delivery_address:
      form.fulfillment === "delivery" ? form.delivery_address : "",
    delivery_reference:
      form.fulfillment === "delivery" ? form.delivery_reference : "",
    items: lines.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      option_ids: l.options.map((o) => o.id).sort(),
    })),
  };
}
