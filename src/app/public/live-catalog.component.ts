import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CatalogCartService, CatalogCartLine, catalogLineTotal } from '../core/catalog-cart.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DbOptionGroup, DbProduct, DbProductOption, PublicMenu, RestaurantApiService
} from '../core/restaurant-api.service';

@Component({
  selector: 'app-live-catalog',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './live-catalog.component.html'
})
export class LiveCatalogComponent implements OnInit {
  private readonly api = inject(RestaurantApiService);
  private readonly route = inject(ActivatedRoute);
  readonly cart = inject(CatalogCartService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly menu = signal<PublicMenu | null>(null);
  readonly picked = signal<Record<string, string[]>>({});
  readonly quantities = signal<Record<string, number>>({});
  readonly cartOpen = signal(false);
  readonly cartNotice = signal('');
  readonly cartError = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const slug = this.route.snapshot.paramMap.get('slug') ?? '';
      const result = await this.api.publicMenu(slug);
      this.menu.set(result);
      if (result) {
        this.cart.setRestaurant(result.restaurant.id);
        this.picked.set({});
        this.quantities.set({});
      }
      if (!result) this.error.set('La carta no está publicada o el restaurante no existe.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No fue posible consultar la carta.');
    } finally { this.loading.set(false); }
  }
  productsInCategory(id: string): DbProduct[] {
    return this.menu()?.products.filter(p => p.category_id === id) ?? [];
  }
  groupsForProduct(id: string): DbOptionGroup[] {
    return this.menu()?.groups.filter(g => g.product_id === id && g.active) ?? [];
  }
  optionsForGroup(id: string): DbProductOption[] {
    return this.menu()?.options.filter(o => o.group_id === id && o.active) ?? [];
  }
  isPicked(groupId: string, optionId: string): boolean {
    return (this.picked()[groupId] ?? []).includes(optionId);
  }
  toggleChoice(group: DbOptionGroup, option: DbProductOption): void {
    if (!group.active || !option.active) return;
    const allowed = this.optionsForGroup(group.id).some(o => o.id === option.id);
    if (!allowed) return;
    const oldChoices = this.picked()[group.id] ?? [];
    const next = oldChoices.includes(option.id)
      ? oldChoices.filter(id => id !== option.id)
      : group.max_select === 1 ? [option.id]
      : oldChoices.length < group.max_select ? [...oldChoices, option.id] : oldChoices;
    this.picked.update(prev => ({ ...prev, [group.id]: next }));
  }
  hasMissingRequiredChoices(productId: string): boolean {
    return this.groupsForProduct(productId).some(g =>
      (this.picked()[g.id] ?? []).length < g.min_select);
  }
  previewPrice(product: DbProduct): number {
    let total = product.price_cents;
    for (const group of this.groupsForProduct(product.id)) {
      for (const option of this.optionsForGroup(group.id)) {
        if (this.isPicked(group.id, option.id)) total += option.extra_price_cents;
      }
    }
    return total;
  }
  quantityFor(productId: string): number {
    return this.quantities()[productId] ?? 1;
  }
  adjustProductQuantity(productId: string, delta: number): void {
    this.quantities.update(prev => ({
      ...prev, [productId]: Math.max(1, Math.min(20, (prev[productId] ?? 1) + delta))
    }));
  }
  addToCart(p: DbProduct): void {
    this.cartError.set('');
    this.cartNotice.set('');
    const menu = this.menu();
    if (!menu || !p.available || this.hasMissingRequiredChoices(p.id)) {
      this.cartError.set('Completa las opciones obligatorias antes de añadir el producto.');
      return;
    }
    try {
      this.cart.add(menu, p.id, this.picked(), this.quantityFor(p.id));
      this.cartNotice.set('Producto añadido al carrito de demostración.');
      this.cartOpen.set(true);
    } catch (err) {
      this.cartError.set(err instanceof Error ? err.message : 'No se pudo añadir el producto.');
    }
  }
  changeCartQuantity(id: string, delta: number): void { this.cart.changeQuantity(id, delta); }
  removeCartLine(id: string): void { this.cart.remove(id); }
  clearCart(): void { this.cart.clear(); this.cartNotice.set('Carrito vaciado.'); }
  lineTotal(line: CatalogCartLine): number { return catalogLineTotal(line); }
  closeCart(): void { this.cartOpen.set(false); }
  toggleCart(): void { this.cartOpen.update(open => !open); }
  @HostListener('document:keydown.escape')
  onEscape(): void { this.cartOpen.set(false); }
  price(cents: number): string {
    return 'S/' + (cents / 100).toFixed(2);
  }
}
