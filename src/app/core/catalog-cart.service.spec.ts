import { describe, expect, it } from 'vitest';
import type { PublicMenu } from './restaurant-api.service';
import {
  CatalogCartService, type CatalogChoices, buildCatalogCartLine, addCatalogLine,
  changeCatalogQuantity, catalogLineTotal
} from './catalog-cart.service';

const menu: PublicMenu = {
  restaurant: {
    id: 'rest-a', slug: 'brasa-norte', name: 'Brasa Norte', phone: '',
    opening_hours: '', accepting_orders: false
  },
  categories: [{ id: 'cat', restaurant_id: 'rest-a', name: 'Pollos', active: true, position: 0 }],
  products: [{
    id: 'pollo', restaurant_id: 'rest-a', category_id: 'cat',
    name: 'Pollo a la brasa', description: '', price_cents: 1890, emoji: '🍗',
    tag: '', image_url: null, active: true, available: true, position: 0
  }],
  groups: [
    { id: 'g1', restaurant_id: 'rest-a', product_id: 'pollo',
      name: 'Acompañamiento', min_select: 1, max_select: 1, active: true, position: 0 },
    { id: 'g2', restaurant_id: 'rest-a', product_id: 'pollo',
      name: 'Extras', min_select: 0, max_select: 2, active: true, position: 1 }
  ],
  options: [
    { id: 'o1', restaurant_id: 'rest-a', group_id: 'g1',
      name: 'Papas clásicas', extra_price_cents: 0, active: true, position: 0 },
    { id: 'o2', restaurant_id: 'rest-a', group_id: 'g1',
      name: 'Papas grandes', extra_price_cents: 300, active: true, position: 1 },
    { id: 'o3', restaurant_id: 'rest-a', group_id: 'g2',
      name: 'Queso extra', extra_price_cents: 200, active: true, position: 0 },
    { id: 'o4', restaurant_id: 'rest-a', group_id: 'g2',
      name: 'Ají', extra_price_cents: 100, active: true, position: 1 }
  ]
};

const valid = { g1: ['o2'], g2: ['o3'] };
const line = (id: string, choices: CatalogChoices = valid, qty = 1) =>
  buildCatalogCartLine(menu, 'pollo', choices, qty, id);

describe('V0.7 · carrito conectado a la carta de Supabase', () => {
  it('calcula opciones y subtotal usando céntimos', () => {
    const item = line('l1', valid, 2);
    expect(item.unitPriceCents).toBe(2390);
    expect(catalogLineTotal(item)).toBe(4780);
  });

  it('no permite omitir un acompañamiento obligatorio', () => {
    expect(() => line('l1', { g1: [], g2: ['o3'] })).toThrow('Acompañamiento');
  });

  it('rechaza opciones inexistentes, duplicadas o de otro grupo', () => {
    expect(() => line('l1', { g1: ['o3'] })).toThrow();
    expect(() => line('l1', { g1: ['o1', 'o1'] })).toThrow();
    expect(() => line('l1', { g1: ['inexistente'] })).toThrow();
  });

  it('no permite añadir platos agotados', () => {
    const disabled = {
      ...menu, products: [{ ...menu.products[0], available: false }]
    };
    expect(() => buildCatalogCartLine(disabled, 'pollo', valid, 1, 'l1')).toThrow('disponible');
  });

  it('agrupa combinaciones idénticas y separa los extras distintos', () => {
    const one = line('l1', { g1: ['o2'], g2: ['o3'] }, 1);
    const sameInOtherOrder = line('l2', { g2: ['o3'], g1: ['o2'] }, 2);
    const different = line('l3', { g1: ['o1'], g2: [] }, 1);
    const merged = addCatalogLine([one], sameInOtherOrder);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(3);
    expect(addCatalogLine(merged, different)).toHaveLength(2);
  });

  it('impide mezclar restaurantes y exceder 20 unidades', () => {
    const original = line('l1', valid, 20);
    expect(() => addCatalogLine([original], line('l2'))).toThrow('20');
    expect(() => addCatalogLine([original], { ...line('l2'), restaurantId: 'rest-b' }))
      .toThrow('otro restaurante');
  });

  it('respeta límites de cantidad y elimina el carrito cuando cambia de restaurante', () => {
    const original = line('l1');
    expect(changeCatalogQuantity([original], 'l1', -1)[0].quantity).toBe(1);
    expect(changeCatalogQuantity([original], 'l1', 1)[0].quantity).toBe(2);
    const store = new CatalogCartService();
    store.setRestaurant('rest-a');
    store.lines.set([original]);
    expect(store.subtotalCents()).toBe(2390);
    store.setRestaurant('rest-b');
    expect(store.lines()).toHaveLength(0);
  });
});
