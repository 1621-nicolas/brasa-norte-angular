import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DbProduct, RestaurantMember, RestaurantApiService } from '../core/restaurant-api.service';

@Component({
  standalone: true,
  selector: 'app-live-management',
  template: `
  <main class="cloud-page">
    <section class="cloud-panel">
      <div class="cloud-heading">
        <div><div class="section-kicker">BRASA NORTE · SUPABASE</div>
          <h1>Gestión de restaurantes</h1>
          <p>Productos sincronizados con la base de datos central.</p></div>
        <button class="btn btn-outline" type="button" (click)="logout()">Cerrar sesión</button>
      </div>
      <div class="micro-banner">Acceso privado V0.4. Solo productos y catálogo, sin pedidos reales.</div>
      @if (error) { <div class="micro-banner" role="alert">{{ error }}</div> }
      @if (notice) { <div class="micro-banner" role="status">{{ notice }}</div> }
      @if (loading) { <p>Cargando restaurantes…</p> }
      @else {
        <div class="cloud-restaurants" role="group" aria-label="Seleccionar restaurante">
          @for (m of memberships; track m.restaurant_id) {
            <button type="button" class="small-action" [class.active]="m.restaurant_id===selectedId"
              (click)="selectRestaurant(m)">{{ m.restaurant.name }} · {{ m.role }}</button>
          }
        </div>
        @if (selected; as s) {
          <div class="cloud-heading">
            <div><h2>{{ s.restaurant.name }}</h2><p>Productos registrados: {{ products.length }}</p></div>
            <span class="demo-pill">{{ s.role === 'staff' ? 'Solo lectura' : 'Edición permitida' }}</span>
          </div>
          <div class="cloud-products">
            @for (p of products; track p.id) {
              <article class="cloud-product cloud-product-admin">
                <div class="cloud-product-icon">{{ p.emoji }}</div>
                <div class="cloud-product-details">
                  <h3>{{ p.name }}</h3>
                  <p>{{ p.description }}</p>
                  <div class="cloud-price-edit">
                    <label class="field">Precio (S/)
                      <input type="number" min="0.5" max="100000" step="0.01" #price [value]="p.price_cents / 100"
                        [disabled]="s.role==='staff' || saving">
                    </label>
                    <button class="small-action" type="button" [disabled]="s.role==='staff' || saving"
                      (click)="savePrice(p, price.value)">Guardar precio</button>
                    <button class="small-action" type="button" [disabled]="s.role==='staff' || saving"
                      (click)="toggleProduct(p)">{{ p.available ? 'Marcar agotado' : 'Activar producto' }}</button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    </section>
  </main>`
})
export class LiveManagementComponent implements OnInit {
  private readonly api = inject(RestaurantApiService);
  private readonly router = inject(Router);
  memberships: RestaurantMember[] = [];
  selected: RestaurantMember | null = null;
  selectedId = '';
  products: DbProduct[] = [];
  error = '';
  notice = '';
  loading = true;
  saving = false;

  async ngOnInit(): Promise<void> {
    try {
      this.memberships = await this.api.memberships();
      if (!this.memberships.length) { await this.router.navigateByUrl('/ingresar'); return; }
      await this.selectRestaurant(this.memberships[0]);
    } catch (err) { this.error = this.errorText(err); }
    finally { this.loading = false; }
  }
  async selectRestaurant(member: RestaurantMember): Promise<void> {
    this.selected = member;
    this.selectedId = member.restaurant_id;
    this.error = ''; this.notice = '';
    try { this.products = await this.api.privateProducts(member.restaurant_id); }
    catch (err) { this.error = this.errorText(err); }
  }
  async savePrice(product: DbProduct, priceInput: string): Promise<void> {
    await this.performUpdate(async () => this.api.changePrice(product, Number(priceInput)));
  }
  async toggleProduct(product: DbProduct): Promise<void> {
    await this.performUpdate(async () => this.api.changeAvailability(product));
  }
  private async performUpdate(operation: () => Promise<void>): Promise<void> {
    if (this.saving || !this.selected) return;
    this.saving = true; this.error = ''; this.notice = '';
    try {
      await operation();
      this.products = await this.api.privateProducts(this.selected.restaurant_id);
      this.notice = 'Información guardada en Supabase.';
    } catch (err) { this.error = this.errorText(err); }
    finally { this.saving = false; }
  }
  async logout(): Promise<void> {
    try { await this.api.signOut(); await this.router.navigateByUrl('/ingresar'); }
    catch (err) { this.error = this.errorText(err); }
  }
  private errorText(err: unknown): string {
    return err instanceof Error ? err.message : 'No se pudo completar la operación.';
  }
}
