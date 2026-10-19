import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  DbOptionGroup, DbProduct, DbProductOption, PublicMenu, RestaurantApiService
} from '../core/restaurant-api.service';

@Component({
  selector: 'app-live-catalog',
  standalone: true,
  imports: [RouterLink],
  template: `
  <main class="cloud-page live-catalog-page">
    <section class="cloud-panel">
      <a routerLink="/r/brasa-norte" class="cloud-back">← Volver a la tienda de demostración</a>
      @if (loading()) {
        <div class="micro-banner" role="status">Cargando carta desde Supabase…</div>
      } @else if (error()) {
        <div class="micro-banner" role="alert">{{ error() }}</div>
      } @else if (menu(); as currentMenu) {
        <div class="section-kicker">CARTA DIGITAL · BRASA NORTE</div>
        <div class="cloud-heading">
          <div>
            <h1>{{ currentMenu.restaurant.name }}</h1>
            <p>{{ currentMenu.restaurant.opening_hours || 'Consulta horarios con el local' }}</p>
          </div>
          <span class="demo-pill">PEDIDOS DESACTIVADOS</span>
        </div>
        <div class="micro-banner">Explora los productos y personaliza tus opciones.
          Esta carta es una demostración y no procesa pedidos ni pagos.</div>
        @for (category of currentMenu.categories; track category.id) {
          <h2 class="cloud-category">{{ category.name }}</h2>
          <div class="cloud-products live-food-grid">
            @for (p of productsInCategory(category.id); track p.id) {
              <article class="cloud-product live-food-card">
                <div class="live-food-image">
                  @if (p.image_url) {
                    <img [src]="p.image_url" [alt]="'Fotografía de '+p.name" loading="lazy">
                  } @else { <span aria-hidden="true">{{ p.emoji }}</span> }
                  @if (p.tag) { <span class="live-food-tag">{{ p.tag }}</span> }
                </div>
                <div class="live-food-details">
                  <h3>{{ p.name }}</h3>
                  <p>{{ p.description }}</p>
                  <div class="live-base-price">
                    <strong>{{ price(p.price_cents) }}</strong>
                    <span>{{ p.available ? 'Disponible' : 'Agotado' }}</span>
                  </div>
                  @for (group of groupsForProduct(p.id); track group.id) {
                    <fieldset class="live-option-set" [disabled]="!p.available">
                      <legend>{{ group.name }}
                        <small> · Elige {{ group.min_select }}–{{ group.max_select }}</small>
                      </legend>
                      <div class="live-choice-list">
                        @for (option of optionsForGroup(group.id); track option.id) {
                          <button type="button" class="live-choice-button"
                            [disabled]="!p.available"
                            [class.selected]="isPicked(group.id, option.id)"
                            [attr.aria-pressed]="isPicked(group.id, option.id)"
                            (click)="toggleChoice(group, option)">
                            <span>{{ isPicked(group.id, option.id) ? '✓ ' : '+ ' }}{{ option.name }}</span>
                            <small>+ {{ price(option.extra_price_cents) }}</small>
                          </button>
                        } @empty {
                          <div class="live-muted">No hay opciones disponibles para este grupo.</div>
                        }
                      </div>
                    </fieldset>
                  }
                  @if (groupsForProduct(p.id).length) {
                    <div class="live-estimated-total">
                      <div><small>Precio de prueba</small><strong>{{ price(previewPrice(p)) }}</strong></div>
                      @if (hasMissingRequiredChoices(p.id)) {
                        <span>Completa las elecciones obligatorias</span>
                      } @else { <span>Opciones seleccionadas</span> }
                    </div>
                  }
                </div>
              </article>
            }
          </div>
        } @empty { <p>Aún no hay categorías visibles.</p> }
      }
    </section>
  </main>`
})
export class LiveCatalogComponent implements OnInit {
  private readonly api = inject(RestaurantApiService);
  private readonly route = inject(ActivatedRoute);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly menu = signal<PublicMenu | null>(null);
  readonly picked = signal<Record<string, string[]>>({});

  async ngOnInit(): Promise<void> {
    try {
      const slug = this.route.snapshot.paramMap.get('slug') ?? '';
      const result = await this.api.publicMenu(slug);
      this.menu.set(result);
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
  price(cents: number): string {
    return 'S/' + (cents / 100).toFixed(2);
  }
}
