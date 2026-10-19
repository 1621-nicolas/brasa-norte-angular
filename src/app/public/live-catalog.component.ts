import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DbProduct, PublicMenu, RestaurantApiService } from '../core/restaurant-api.service';

@Component({
  selector: 'app-live-catalog',
  standalone: true,
  imports: [RouterLink],
  template: `
  <main class="cloud-page">
    <section class="cloud-panel">
      <a routerLink="/r/brasa-norte" class="cloud-back">← Volver a la demostración</a>
      @if (loading) { <div class="micro-banner" role="status">Cargando carta desde Supabase…</div> }
      @else if (error) { <div class="micro-banner" role="alert">{{ error }}</div> }
      @else if (menu) {
        <div class="section-kicker">CARTA EN POSTGRESQL · SOLO LECTURA</div>
        <div class="cloud-heading">
          <div><h1>{{ menu.restaurant.name }}</h1><p>{{ menu.restaurant.opening_hours }}</p></div>
          <span class="demo-pill">PEDIDOS NO HABILITADOS</span>
        </div>
        <div class="micro-banner">Menú de prueba obtenido de la base de datos. Todavía no se aceptan pedidos ni pagos reales.</div>
        @for (category of menu.categories; track category.id) {
          <h2 class="cloud-category">{{ category.name }}</h2>
          <div class="cloud-products">
            @for (product of productsOf(category.id); track product.id) {
              <article class="cloud-product">
                <div class="cloud-product-icon">{{ product.emoji }}</div>
                <div class="cloud-product-details">
                  <h3>{{ product.name }}</h3><p>{{ product.description }}</p>
                  <div class="cloud-product-bottom"><strong>{{ price(product.price_cents) }}</strong>
                    <span>{{ product.available ? 'Disponible' : 'Agotado' }}</span></div>
                </div>
              </article>
            }
          </div>
        }
      }
    </section>
  </main>`
})
export class LiveCatalogComponent implements OnInit {
  private readonly api = inject(RestaurantApiService);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  error = '';
  menu: PublicMenu | null = null;
  async ngOnInit(): Promise<void> {
    try {
      const slug = this.route.snapshot.paramMap.get('slug') ?? '';
      this.menu = await this.api.publicMenu(slug);
      if (!this.menu) this.error = 'La carta no está publicada o el restaurante no existe.';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Error al consultar el menú.';
    } finally { this.loading = false; }
  }
  productsOf(id: string): DbProduct[] {
    return this.menu?.products.filter(p => p.category_id === id) ?? [];
  }
  price(cents: number): string { return 'S/' + (cents / 100).toFixed(2); }
}
