import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { LiveCatalogComponent } from './live-catalog.component';
import { PublicMenu, RestaurantApiService } from '../core/restaurant-api.service';

const menu: PublicMenu = {
  restaurant: {
    id: 'rest-demo', slug: 'brasa-norte', name: 'Brasa Norte',
    phone: '900000000', opening_hours: '11:00 a 22:00', accepting_orders: false
  },
  categories: [
    { id: 'cat-1', restaurant_id: 'rest-demo', name: 'Pollos', position: 0, active: true }
  ],
  groups: [],
  options: [],
  products: [
    {
      id: 'p-1', restaurant_id: 'rest-demo', category_id: 'cat-1',
      name: 'Pollo de prueba', description: 'Producto ficticio',
      price_cents: 1890, emoji: '🍗', tag: '', image_url: null,
      available: true, active: true, position: 0
    }
  ]
};

async function render(publicMenu: () => Promise<PublicMenu | null>) {
  await TestBed.configureTestingModule({
    imports: [LiveCatalogComponent],
    providers: [
      provideRouter([]),
      { provide: RestaurantApiService, useValue: { publicMenu } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'brasa-norte' } } } }
    ]
  }).compileComponents();
  const fixture = TestBed.createComponent(LiveCatalogComponent);
  fixture.detectChanges();
  await new Promise<void>(resolve => queueMicrotask(resolve));
  await fixture.whenStable();
  return fixture;
}

describe('LiveCatalogComponent · carga async con Angular zoneless', () => {
  it('deja de mostrar Cargando y muestra el menú al finalizar Supabase', async () => {
    const fetchMenu = vi.fn(async () => menu);
    const fixture = await render(fetchMenu);
    const html = fixture.nativeElement.textContent as string;
    expect(fetchMenu).toHaveBeenCalledWith('brasa-norte');
    expect(html).toContain('Pollo de prueba');
    expect(html).toContain('S/18.90');
    expect(html).not.toContain('Cargando carta desde Supabase');
  });

  it('muestra mensaje cuando el local no está publicado', async () => {
    const fixture = await render(async () => null);
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('La carta no está publicada');
    expect(html).not.toContain('Cargando carta desde Supabase');
  });

  it('suma complementos seleccionados sin registrar un pedido', async () => {
    const decoratedMenu: PublicMenu = {
      ...menu,
      groups: [{
        id: 'g1', restaurant_id: 'rest-demo', product_id: 'p-1',
        name: 'Acompañamiento', min_select: 1, max_select: 1, active: true, position: 0
      }],
      options: [{
        id: 'o1', restaurant_id: 'rest-demo', group_id: 'g1',
        name: 'Papas grandes', extra_price_cents: 300, active: true, position: 0
      }]
    };
    const fixture = await render(async () => decoratedMenu);
    const page = fixture.componentInstance;
    expect(page.hasMissingRequiredChoices('p-1')).toBe(true);
    page.toggleChoice(decoratedMenu.groups[0], decoratedMenu.options[0]);
    fixture.detectChanges();
    expect(page.hasMissingRequiredChoices('p-1')).toBe(false);
    expect(page.previewPrice(decoratedMenu.products[0])).toBe(2190);
    expect(fixture.nativeElement.textContent).toContain('S/21.90');
    // Una segunda selección del mismo complemento lo desmarca.
    page.toggleChoice(decoratedMenu.groups[0], decoratedMenu.options[0]);
    expect(page.previewPrice(decoratedMenu.products[0])).toBe(1890);
  });
});
