import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DemoStoreService } from '../core/demo-store.service';
import { Checkout, Choices, Order, Product, CATEGORIES, ZONES } from '../core/models';

@Component({
  standalone: true,
  selector: "app-storefront",
  imports: [FormsModule, RouterLink],
  templateUrl: "./storefront.component.html",
})
export class StorefrontComponent {
  readonly Math = Math;
  readonly store = inject(DemoStoreService);
  readonly categories = ["Todas", ...CATEGORIES];
  readonly zones = Object.entries(ZONES).map(([key, name]) => ({ key, name }));
  readonly category = signal("Todas");
  readonly search = signal("");
  readonly shownProducts = computed(() =>
    this.store
      .products()
      .filter(
        (p) =>
          (this.category() === "Todas" || p.category === this.category()) &&
          `${p.name} ${p.description} ${p.category}`
            .toLocaleLowerCase("es-PE")
            .includes(this.search().trim().toLocaleLowerCase("es-PE")),
      ),
  );
  readonly message = signal("");
  modal: "none" | "product" | "checkout" | "confirmation" = "none";
  selectedId = "";
  selectedChoices: Choices = {};
  selectedQty = 1;
  receipt: Order | null = null;
  checkout: Checkout = this.newCheckout();

  get selectedProduct(): Product | undefined {
    return this.store.product(this.selectedId);
  }
  get canAdd(): boolean {
    return (
      !!this.selectedProduct?.available &&
      this.store.choicesValid(this.selectedProduct, this.selectedChoices)
    );
  }
  get selectedUnit(): number {
    return this.selectedProduct
      ? this.store.unitPrice(this.selectedProduct, this.selectedChoices)
      : 0;
  }
  get overlayOpen(): boolean {
    return this.modal !== "none" || this.store.cartOpen();
  }
  get checkoutCost(): number {
    return this.store.checkoutTotal(
      this.checkout.fulfillment,
      this.checkout.zone,
    );
  }
  @HostListener("document:keydown.escape") onEscape(): void {
    this.closeAll();
  }

  private newCheckout(): Checkout {
    return {
      customer: "",
      phone: "",
      fulfillment: "delivery",
      zone: "cercana",
      address: "",
      payment: "efectivo",
      notes: "",
    };
  }
  format(price: number): string {
    return `S/${price.toFixed(2)}`;
  }
  palette(p: Product): [string, string] {
    const colors: Record<string, [string, string]> = {
      "Pollos a la brasa": ["#f7e8c8", "#efcf98"],
      Hamburguesas: ["#f3d9cc", "#f0bb9f"],
      Piqueos: ["#f8e5b9", "#f1ca83"],
      Bebidas: ["#dcece0", "#acdbc6"],
    };
    return colors[p.category] || ["#e9e5dc", "#c7ddcc"];
  }
  openProduct(product: Product): void {
    if (!product.available) return;
    this.selectedId = product.id;
    this.selectedQty = 1;
    this.selectedChoices = {};
    for (const group of product.groups)
      this.selectedChoices[group.id] =
        group.min > 0 ? group.options.slice(0, group.min).map((o) => o.id) : [];
    this.store.cartOpen.set(false);
    this.modal = "product";
    this.message.set("");
  }
  selected(groupId: string, optionId: string): boolean {
    return (this.selectedChoices[groupId] || []).includes(optionId);
  }
  toggleOption(groupId: string, optionId: string): void {
    const group = this.selectedProduct?.groups.find((g) => g.id === groupId);
    if (!group) return;
    const current = this.selectedChoices[groupId] ?? [];
    if (group.max === 1)
      this.selectedChoices = { ...this.selectedChoices, [groupId]: [optionId] };
    else if (current.includes(optionId))
      this.selectedChoices = {
        ...this.selectedChoices,
        [groupId]: current.filter((id) => id !== optionId),
      };
    else if (current.length < group.max)
      this.selectedChoices = {
        ...this.selectedChoices,
        [groupId]: [...current, optionId],
      };
    else this.message.set(`Puedes seleccionar máximo ${group.max} opciones.`);
  }
  addSelected(): void {
    if (
      this.store.addToCart(
        this.selectedId,
        this.selectedChoices,
        this.selectedQty,
      )
    ) {
      this.modal = "none";
      this.store.cartOpen.set(true);
      this.message.set("Producto agregado al carrito.");
    } else this.message.set("Completa las opciones obligatorias del producto.");
  }
  openCheckout(): void {
    if (this.store.cartCount() === 0) return;
    this.checkout = this.newCheckout();
    this.store.cartOpen.set(false);
    this.modal = "checkout";
    this.message.set("");
  }
  submitOrder(): void {
    try {
      this.receipt = this.store.createDemoOrder(this.checkout);
      this.modal = "confirmation";
      this.message.set("");
    } catch (err) {
      this.message.set(
        err instanceof Error ? err.message : "No se pudo crear el pedido.",
      );
    }
  }
  closeAll(): void {
    this.modal = "none";
    this.store.cartOpen.set(false);
    this.message.set("");
  }
}
