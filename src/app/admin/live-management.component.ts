import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DbCategory, DbProduct, RestaurantMember, RestaurantApiService, RestaurantSummary
} from '../core/restaurant-api.service';

interface ProductDraft {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  tag: string;
  active: boolean;
  available: boolean;
}

@Component({
  standalone: true,
  selector: 'app-live-management',
  imports: [FormsModule, RouterLink],
  templateUrl: './live-management.component.html'
})
export class LiveManagementComponent implements OnInit {
  private readonly api = inject(RestaurantApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestId = 0;

  memberships: RestaurantMember[] = [];
  selected: RestaurantMember | null = null;
  products: DbProduct[] = [];
  categories: DbCategory[] = [];
  tab: 'products' | 'categories' | 'settings' | 'orders' = 'products';
  editing: ProductDraft | null = null;
  newCategoryName = '';
  settings = { name: '', phone: '', opening_hours: '' };
  error = '';
  notice = '';
  loading = true;
  saving = false;

  readonly emojis = ['🍗', '🍔', '🍟', '🥤', '🥗', '🍕', '🍽️', '🧃', '🌭', '🍰'];

  get canEdit(): boolean {
    return this.selected?.role === 'owner' || this.selected?.role === 'manager';
  }

  get heading(): string {
    return ({
      products: 'Productos y carta',
      categories: 'Categorías',
      settings: 'Configuración del local',
      orders: 'Pedidos'
    })[this.tab];
  }

  get availableCount(): number {
    return this.products.filter(p => p.active && p.available).length;
  }

  get inactiveCount(): number {
    return this.products.filter(p => !p.active || !p.available).length;
  }

  @HostListener('document:keydown.escape')
  escape(): void { this.editing = null; }

  async ngOnInit(): Promise<void> {
    try {
      this.memberships = await this.api.memberships();
      if (!this.memberships.length) {
        await this.router.navigateByUrl('/ingresar');
        return;
      }
      await this.selectRestaurant(this.memberships[0]);
    } catch (err) {
      this.error = this.errorMessage(err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async selectRestaurant(member: RestaurantMember): Promise<void> {
    const currentRequest = ++this.requestId;
    this.selected = member;
    this.products = [];
    this.categories = [];
    this.settings = {
      name: member.restaurant.name,
      phone: member.restaurant.phone,
      opening_hours: member.restaurant.opening_hours
    };
    this.error = '';
    this.notice = '';
    this.loading = true;
    this.editing = null;
    this.cdr.markForCheck();
    try {
      const [products, categories] = await Promise.all([
        this.api.privateProducts(member.restaurant_id),
        this.api.categoriesForRestaurant(member.restaurant_id)
      ]);
      if (currentRequest !== this.requestId) return;
      this.products = products;
      this.categories = categories;
    } catch (err) {
      if (currentRequest === this.requestId) this.error = this.errorMessage(err);
    } finally {
      if (currentRequest === this.requestId) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  selectRestaurantById(id: string): void {
    if (this.saving) return;
    const member = this.memberships.find(m => m.restaurant_id === id);
    if (member) void this.selectRestaurant(member);
  }

  changeTab(next: typeof this.tab): void {
    this.tab = next;
    this.notice = '';
    this.error = '';
  }

  newProduct(): void {
    if (!this.canEdit || this.categories.length === 0) return;
    this.editing = {
      category_id: this.categories.find(c => c.active)?.id || this.categories[0].id,
      name: '', description: '', price: 20, emoji: '🍽️', tag: '',
      active: true, available: true
    };
  }

  editProduct(p: DbProduct): void {
    if (!this.canEdit) return;
    this.editing = {
      id: p.id, category_id: p.category_id, name: p.name,
      description: p.description, price: p.price_cents / 100,
      emoji: p.emoji, tag: p.tag, active: p.active, available: p.available
    };
  }

  async saveProduct(): Promise<void> {
    if (!this.canEdit || !this.selected || !this.editing || this.saving) return;
    const draft = { ...this.editing };
    const restaurantId = this.selected.restaurant_id;
    await this.performUpdate(async () => {
      await this.api.saveProduct(restaurantId, draft);
      await this.reloadCatalog(restaurantId);
      this.editing = null;
      this.notice = draft.id ? 'Producto actualizado en PostgreSQL.' : 'Producto creado en PostgreSQL.';
    });
  }

  async toggleProduct(p: DbProduct): Promise<void> {
    if (!this.canEdit || !this.selected || this.saving) return;
    const restaurantId = this.selected.restaurant_id;
    await this.performUpdate(async () => {
      await this.api.changeAvailability(p);
      await this.reloadCatalog(restaurantId);
      this.notice = 'Disponibilidad actualizada en Supabase.';
    });
  }

  async addCategory(): Promise<void> {
    if (!this.canEdit || !this.selected || this.saving) return;
    const restaurantId = this.selected.restaurant_id;
    const name = this.newCategoryName;
    await this.performUpdate(async () => {
      await this.api.addCategory(restaurantId, name);
      await this.reloadCatalog(restaurantId);
      this.newCategoryName = '';
      this.notice = 'Categoría creada correctamente.';
    });
  }

  async saveSettings(): Promise<void> {
    if (!this.canEdit || !this.selected || this.saving) return;
    const restaurantId = this.selected.restaurant_id;
    const values = { ...this.settings };
    await this.performUpdate(async () => {
      const restaurant: RestaurantSummary = await this.api.saveRestaurantSettings(restaurantId, values);
      if (this.selected?.restaurant_id === restaurantId) {
        this.selected.restaurant = restaurant;
        this.settings = {
          name: restaurant.name, phone: restaurant.phone, opening_hours: restaurant.opening_hours
        };
      }
      this.notice = 'Datos comerciales actualizados en Supabase.';
    });
  }

  async logout(): Promise<void> {
    if (this.saving) return;
    try {
      await this.api.signOut();
      await this.router.navigateByUrl('/ingresar');
    } catch (err) {
      this.error = this.errorMessage(err);
      this.cdr.markForCheck();
    }
  }

  categoryName(categoryId: string): string {
    return this.categories.find(c => c.id === categoryId)?.name ?? 'Sin categoría';
  }

  price(cents: number): string {
    return 'S/' + (cents / 100).toFixed(2);
  }

  private async reloadCatalog(id: string): Promise<void> {
    const [products, categories] = await Promise.all([
      this.api.privateProducts(id), this.api.categoriesForRestaurant(id)
    ]);
    if (this.selected?.restaurant_id === id) {
      this.products = products;
      this.categories = categories;
    }
  }

  private async performUpdate(fn: () => Promise<void>): Promise<void> {
    if (this.saving) return;
    this.error = '';
    this.notice = '';
    this.saving = true;
    this.cdr.markForCheck();
    try {
      await fn();
    } catch (err) {
      this.error = this.errorMessage(err);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'La operación no pudo completarse.';
  }
}
