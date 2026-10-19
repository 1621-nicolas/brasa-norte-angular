import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { LiveManagementComponent } from './live-management.component';
import { RestaurantApiService, type RestaurantMember, type DbCategory, type DbProduct } from '../core/restaurant-api.service';

const member: RestaurantMember = {
  restaurant_id: 'rest-a',
  role: 'owner',
  restaurant: {
    id: 'rest-a', slug: 'brasa-norte', name: 'Brasa Norte',
    phone: '900000000', opening_hours: '11:00 a 22:00', accepting_orders: false
  }
};
const category: DbCategory = {
  id: 'cat-a', restaurant_id: 'rest-a', name: 'Pollos', position: 0, active: true
};
const product: DbProduct = {
  id: 'p-a', restaurant_id: 'rest-a', category_id: 'cat-a', name: 'Pollo de prueba',
  description: 'Plato de demostración', price_cents: 1890, emoji: '🍗',
  tag: '', image_url: null, available: true, active: true, position: 0
};

async function setup(role: RestaurantMember['role'] = 'owner') {
  const api = {
    memberships: vi.fn().mockResolvedValue([{ ...member, role }]),
    privateProducts: vi.fn().mockResolvedValue([product]),
    categoriesForRestaurant: vi.fn().mockResolvedValue([category]),
    saveProduct: vi.fn().mockResolvedValue(undefined),
    changeAvailability: vi.fn().mockResolvedValue(undefined),
    addCategory: vi.fn().mockResolvedValue(undefined),
    saveRestaurantSettings: vi.fn().mockResolvedValue(member.restaurant),
    signOut: vi.fn().mockResolvedValue(undefined)
  };
  await TestBed.configureTestingModule({
    imports: [LiveManagementComponent],
    providers: [provideRouter([]), { provide: RestaurantApiService, useValue: api }]
  }).compileComponents();
  const fixture = TestBed.createComponent(LiveManagementComponent);
  fixture.detectChanges();
  // ngOnInit es asíncrono: whenStable() puede completarse antes de las promesas
  // externas del servicio simulado. Esperamos explícitamente la carga real.
  await vi.waitFor(() => {
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.products.length).toBe(1);
  }, { timeout: 2500 });
  fixture.detectChanges();
  return { api, fixture, component: fixture.componentInstance };
}

describe('Brasa Norte · panel privado multi-restaurante', () => {
  it('muestra la barra lateral y productos desde la base de datos simulada', async () => {
    const { component, fixture } = await setup();
    expect(component.products.length).toBe(1);
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('Productos y carta');
    expect(html).toContain('Pollo de prueba');
    expect(html).toContain('S/18.90');
  });

  it('no permite editar productos a un empleado staff', async () => {
    const { component, api } = await setup('staff');
    expect(component.canEdit).toBe(false);
    component.newProduct();
    expect(component.editing).toBeNull();
    await component.toggleProduct(product);
    expect(api.changeAvailability).not.toHaveBeenCalled();
  });

  it('el propietario puede preparar un producto nuevo', async () => {
    const { component } = await setup();
    component.newProduct();
    expect(component.editing?.category_id).toBe('cat-a');
    expect(component.editing?.price).toBe(20);
  });
});
