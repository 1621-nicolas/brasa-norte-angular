import { Component, HostListener, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { DemoStoreService } from "../core/demo-store.service";
import {
  CATEGORIES,
  ORDER_LABELS,
  Order,
  OrderStatus,
  Product,
  Settings,
  STATUS_NEXT,
  ZONES,
} from "../core/models";

@Component({
  standalone: true,
  selector: "app-admin",
  imports: [FormsModule, RouterLink],
  templateUrl: "./admin.component.html",
})
export class AdminComponent {
  readonly store = inject(DemoStoreService);
  readonly categories = CATEGORIES;
  readonly labels = ORDER_LABELS;
  readonly zones = Object.entries(ZONES).map(([key, name]) => ({ key, name }));
  readonly emojiOptions = [
    "🍗",
    "🍖",
    "🍔",
    "🍟",
    "🥤",
    "🍽️",
    "🥗",
    "🍕",
    "🧃",
    "🌭",
  ];
  tab: "orders" | "products" | "settings" = "orders";
  editing: Product | null = null;
  isNew = false;
  notice = "";
  editSettings: Settings = structuredClone(this.store.settings());
  get pending(): number {
    return this.store.orders().filter((o) => o.status === "pendiente").length;
  }
  get processing(): number {
    return this.store
      .orders()
      .filter((o) =>
        ["confirmado", "preparando", "listo", "en_camino"].includes(o.status),
      ).length;
  }
  get completed(): number {
    return this.store.orders().filter((o) => o.status === "entregado").length;
  }
  get heading(): string {
    return {
      orders: "Pedidos de prueba",
      products: "Productos y carta",
      settings: "Configuración del local",
    }[this.tab];
  }
  @HostListener("document:keydown.escape") onEscape(): void {
    this.editing = null;
  }
  format(value: number): string {
    return `S/${value.toFixed(2)}`;
  }
  date(value: string): string {
    return new Date(value).toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  nextStatus(order: Order): OrderStatus | null {
    if (order.status === "listo" && order.fulfillment === "pickup")
      return "entregado";
    return STATUS_NEXT[order.status] ?? null;
  }
  nextLabel(order: Order): string {
    const next = this.nextStatus(order);
    return (
      (
        {
          confirmado: "Aceptar",
          preparando: "Preparar",
          listo: "Marcar listo",
          en_camino: "Enviar a reparto",
          entregado: "Marcar entregado",
        } as Partial<Record<OrderStatus, string>>
      )[next ?? "pendiente"] || ""
    );
  }
  move(order: Order, next: OrderStatus | null): void {
    if (next && this.store.changeOrderStatus(order.id, next))
      this.notice = `Pedido ${order.code}: estado actualizado (demo).`;
    else this.notice = "Cambio de estado no permitido.";
  }
  newProduct(): void {
    this.isNew = true;
    this.editing = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),
      name: "",
      description: "",
      price: 20,
      category: CATEGORIES[0],
      emoji: "🍽️",
      tag: "",
      available: true,
      groups: [],
    };
  }
  edit(product: Product): void {
    this.isNew = false;
    this.editing = structuredClone(product);
  }
  saveProduct(): void {
    if (!this.editing) return;
    try {
      this.store.saveProduct(this.editing);
      this.notice = this.isNew
        ? "Producto creado (demo)."
        : "Producto actualizado (demo).";
      this.editing = null;
    } catch (err) {
      this.notice =
        err instanceof Error ? err.message : "Error al guardar el producto.";
    }
  }
  saveSettings(): void {
    try {
      this.store.saveSettings(this.editSettings);
      this.notice = "Configuración guardada (demo).";
    } catch (err) {
      this.notice =
        err instanceof Error ? err.message : "Error al guardar configuración.";
    }
  }
  changeTab(tab: "orders" | "products" | "settings"): void {
    this.tab = tab;
    this.notice = "";
    if (tab === "settings")
      this.editSettings = structuredClone(this.store.settings());
  }
  reset(): void {
    if (
      !confirm(
        "¿Restablecer todos los productos, configuraciones y pedidos de prueba en este navegador?",
      )
    )
      return;
    this.store.reset();
    this.editSettings = structuredClone(this.store.settings());
    this.notice = "Datos ficticios restablecidos.";
  }
}
