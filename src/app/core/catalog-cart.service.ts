import { Injectable, computed, signal } from '@angular/core';
import {
  DbProduct, DbOptionGroup, PublicMenu
} from './restaurant-api.service';

export interface CatalogCartOption {
  id: string;
  groupId: string;
  name: string;
  groupName: string;
  extraPriceCents: number;
}
export interface CatalogCartLine {
  id: string;
  restaurantId: string;
  productId: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  quantity: number;
  basePriceCents: number;
  options: CatalogCartOption[];
  signature: string;
  unitPriceCents: number;
}
export type CatalogChoices = Record<string, string[]>;

export function catalogGroups(menu: PublicMenu, productId: string): DbOptionGroup[] {
  return menu.groups.filter(g =>
    g.restaurant_id === menu.restaurant.id && g.product_id === productId && g.active);
}

/** Solo catálogos de demo: precio informativo, jamás utilizable para cobrar. */
export function buildCatalogCartLine(
  menu: PublicMenu,
  productId: string,
  choices: CatalogChoices,
  quantity: number,
  lineId: string
): CatalogCartLine {
  const product: DbProduct | undefined = menu.products.find(p =>
    p.id === productId && p.restaurant_id === menu.restaurant.id &&
    p.active && p.available && menu.categories.some(c =>
      c.id === p.category_id && c.active && c.restaurant_id === p.restaurant_id));
  if (!product) throw new Error('Este producto no está disponible.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    throw new Error('Elige entre 1 y 20 unidades.');
  const selected: CatalogCartOption[] = [];
  const groups = catalogGroups(menu, productId);
  for (const group of groups) {
    const ids = choices[group.id] ?? [];
    const opts = menu.options.filter(o =>
      o.group_id === group.id && o.restaurant_id === menu.restaurant.id && o.active);
    if (new Set(ids).size !== ids.length || ids.length < group.min_select ||
        ids.length > group.max_select || ids.some(id => !opts.some(o => o.id === id))) {
      throw new Error('Completa las opciones obligatorias de ' + group.name + '.');
    }
    for (const id of ids) {
      const option = opts.find(o => o.id === id)!;
      selected.push({
        id: option.id, groupId: group.id, name: option.name,
        groupName: group.name, extraPriceCents: option.extra_price_cents
      });
    }
  }
  const signature = selected.map(o => o.groupId + ':' + o.id).sort().join('|');
  return {
    id: lineId, restaurantId: menu.restaurant.id, productId: product.id,
    name: product.name, emoji: product.emoji, imageUrl: product.image_url,
    quantity, basePriceCents: product.price_cents, options: selected,
    signature,
    unitPriceCents: product.price_cents +
      selected.reduce((sum, option) => sum + option.extraPriceCents, 0)
  };
}

export function addCatalogLine(lines: CatalogCartLine[], line: CatalogCartLine): CatalogCartLine[] {
  if (lines.some(l => l.restaurantId !== line.restaurantId))
    throw new Error('El carrito pertenece a otro restaurante.');
  const duplicate = lines.find(l => l.productId === line.productId && l.signature === line.signature);
  if (!duplicate) return [...lines, line];
  if (duplicate.quantity + line.quantity > 20)
    throw new Error('El límite es de 20 unidades por combinación.');
  return lines.map(l => l.id === duplicate.id ? { ...l, quantity: l.quantity + line.quantity } : l);
}

export function changeCatalogQuantity(
  lines: CatalogCartLine[], id: string, delta: number
): CatalogCartLine[] {
  if (!Number.isInteger(delta) || Math.abs(delta) !== 1) return lines;
  return lines.map(l => l.id === id ?
    { ...l, quantity: Math.max(1, Math.min(20, l.quantity + delta)) } : l);
}

export function catalogLineTotal(line: CatalogCartLine): number {
  return line.unitPriceCents * line.quantity;
}

@Injectable({ providedIn: 'root' })
export class CatalogCartService {
  private readonly activeRestaurantId = signal<string | null>(null);
  readonly lines = signal<CatalogCartLine[]>([]);
  readonly itemCount = computed(() => this.lines().reduce((sum, l) => sum + l.quantity, 0));
  readonly subtotalCents = computed(() => this.lines().reduce((sum, l) => sum + catalogLineTotal(l), 0));

  setRestaurant(id: string): void {
    if (this.activeRestaurantId() !== id) {
      this.activeRestaurantId.set(id);
      this.lines.set([]);
    }
  }
  add(menu: PublicMenu, productId: string, choices: CatalogChoices, quantity: number): void {
    this.setRestaurant(menu.restaurant.id);
    const line = buildCatalogCartLine(menu, productId, choices, quantity, crypto.randomUUID());
    this.lines.update(current => addCatalogLine(current, line));
  }
  changeQuantity(id: string, delta: number): void {
    this.lines.update(current => changeCatalogQuantity(current, id, delta));
  }
  remove(id: string): void {
    this.lines.update(current => current.filter(l => l.id !== id));
  }
  clear(): void { this.lines.set([]); }
}
