import { Injectable } from "@angular/core";
import { supabase } from "./supabase-client";
import { OrderStatus } from "./models";
import {
  DeliveryZone,
  OrderDetail,
  OrderSummary,
  TestAccess,
  TestOrder,
} from "./test-orders.models";
export class TestOrderError extends Error {
  constructor(
    message: string,
    readonly code = "",
  ) {
    super(message);
  }
}
const ORDER_SELECT =
  "id,restaurant_id,code,status,is_test,created_at,updated_at,created_by,customer_name,customer_phone,fulfillment,delivery_address,delivery_reference,delivery_zone_name_snapshot,notes,subtotal_cents,delivery_fee_cents,total_cents";
@Injectable({ providedIn: "root" })
export class TestOrdersService {
  private async command<T>(
    action: string,
    restaurantId: string,
    payload: unknown = {},
  ): Promise<T> {
    const { data, error } = await supabase.rpc("test_orders_command", {
      p_action: action,
      p_restaurant_id: restaurantId,
      p_payload: payload,
    });
    if (error)
      throw new TestOrderError(
        "No se pudo completar la operación. Comprueba tu sesión y tus permisos.",
        error.message,
      );
    return data as T;
  }
  access(id: string) {
    return this.command<TestAccess>("access", id);
  }
  configure(id: string, enabled: boolean) {
    return this.command<{ enabled: boolean }>("configure", id, { enabled });
  }
  authorize(id: string, userId: string, enabled: boolean) {
    return this.command("authorize", id, { user_id: userId, enabled });
  }
  summary(id: string) {
    return this.command<OrderSummary>("summary", id);
  }
  async zones(id: string): Promise<DeliveryZone[]> {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("id,name,fee_cents")
      .eq("restaurant_id", id)
      .eq("active", true)
      .order("name");
    if (error) throw new Error("No se pudieron cargar las zonas de reparto.");
    return data ?? [];
  }
  async submit(id: string, payload: unknown): Promise<TestOrder> {
    return this.edge("create", id, payload);
  }
  async transition(
    id: string,
    order: TestOrder,
    status: OrderStatus,
    reason = "",
  ): Promise<TestOrder> {
    return this.edge("transition", id, {
      order_id: order.id,
      expected_status: order.status,
      status,
      reason,
    });
  }
  private async edge(
    action: string,
    id: string,
    payload: unknown,
  ): Promise<TestOrder> {
    const { data, error } = await supabase.functions.invoke("test-orders", {
      body: { action, restaurant_id: id, payload },
    });
    if (error) {
      // FunctionsHttpError exposes the JSON response in context. No raw DB errors.
      const context = (error as { context?: Response }).context;
      if (context instanceof Response) {
        const body = (await context.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;
        throw new TestOrderError(
          body?.error ?? "No se pudo confirmar la operación.",
          body?.code,
        );
      }
      throw new TestOrderError(
        "No hay respuesta del servidor. Reintenta la misma confirmación; no se duplicará el pedido.",
        "NETWORK",
      );
    }
    if (!data?.order?.id)
      throw new TestOrderError(
        "El servidor devolvió una respuesta incompleta.",
        "NETWORK",
      );
    return data.order as TestOrder;
  }
  async list(
    id: string,
    status: OrderStatus | "",
    search: string,
    page: number,
  ): Promise<{ orders: TestOrder[]; count: number }> {
    let query = supabase
      .from("orders")
      .select(ORDER_SELECT, { count: "exact" })
      .eq("restaurant_id", id)
      .eq("is_test", true);
    if (status) query = query.eq("status", status);
    const code = search
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 40);
    if (code) query = query.ilike("code", `%${code}%`);
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(page * 20, page * 20 + 19);
    if (error)
      throw new Error("No se pudo actualizar la lista. Comprueba tu conexión.");
    return { orders: (data ?? []) as TestOrder[], count: count ?? 0 };
  }
  async detail(id: string, orderId: string): Promise<OrderDetail> {
    const [order, items, history] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("restaurant_id", id)
        .eq("is_test", true)
        .eq("id", orderId)
        .single(),
      supabase
        .from("order_items")
        .select(
          "id,product_name_snapshot,quantity,unit_price_cents,line_total_cents,order_item_options(option_name_snapshot,extra_price_cents)",
        )
        .eq("restaurant_id", id)
        .eq("order_id", orderId)
        .order("id"),
      supabase
        .from("order_status_history")
        .select("id,actor_user_id,old_status,new_status,reason,created_at")
        .eq("restaurant_id", id)
        .eq("order_id", orderId)
        .order("created_at")
        .order("id"),
    ]);
    if (order.error || items.error || history.error)
      throw new Error("No se pudo consultar el detalle de este pedido.");
    return {
      order: order.data as TestOrder,
      items: items.data ?? [],
      history: history.data ?? [],
    } as OrderDetail;
  }
}
