import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';

export interface RestaurantSummary {
  id: string;
  slug: string;
  name: string;
  phone: string;
  opening_hours: string;
  accepting_orders: boolean;
}
export interface RestaurantMember {
  restaurant_id: string;
  role: 'owner' | 'manager' | 'staff';
  restaurant: RestaurantSummary;
}
export interface DbCategory {
  id: string;
  restaurant_id: string;
  name: string;
  position: number;
  active: boolean;
}
export interface DbProduct {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  emoji: string;
  tag: string;
  image_url: string | null;
  available: boolean;
  active: boolean;
  position: number;
}
export interface PublicMenu {
  restaurant: RestaurantSummary;
  categories: DbCategory[];
  products: DbProduct[];
}

/** Consultas contra Supabase. RLS valida todos los accesos en PostgreSQL. */
@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  async currentUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('No fue posible iniciar sesión. Revisa tus credenciales.');
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión.');
  }

  async memberships(): Promise<RestaurantMember[]> {
    const userId = await this.currentUserId();
    if (!userId) return [];
    const { data: memberships, error } = await supabase.from('restaurant_members')
      .select('restaurant_id, role').eq('user_id', userId);
    if (error) throw new Error('No se pudieron comprobar tus permisos.');
    const output: RestaurantMember[] = [];
    for (const m of (memberships ?? [])) {
      const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
        .select('id, slug, name, phone, opening_hours, accepting_orders')
        .eq('id', m.restaurant_id).maybeSingle();
      if (restaurantError) throw new Error('No se pudo consultar tu restaurante.');
      if (restaurant) output.push({
        restaurant_id: m.restaurant_id,
        role: m.role as RestaurantMember['role'],
        restaurant: restaurant as RestaurantSummary
      });
    }
    return output;
  }

  async publicMenu(slug: string): Promise<PublicMenu | null> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
    const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
      .select('id, slug, name, phone, opening_hours, accepting_orders')
      .eq('slug', slug).eq('published', true).maybeSingle();
    if (restaurantError) throw new Error('No se pudo cargar el restaurante.');
    if (!restaurant) return null;
    const [categories, products] = await Promise.all([
      supabase.from('categories').select('id, restaurant_id, name, position, active')
        .eq('restaurant_id', restaurant.id).eq('active', true).order('position'),
      supabase.from('products').select('id, restaurant_id, category_id, name, description, price_cents, emoji, tag, image_url, available, active, position')
        .eq('restaurant_id', restaurant.id).eq('active', true).order('position')
    ]);
    if (categories.error || products.error) throw new Error('No se pudo cargar la carta.');
    return {
      restaurant: restaurant as RestaurantSummary,
      categories: (categories.data ?? []) as DbCategory[],
      products: (products.data ?? []) as DbProduct[]
    };
  }

  async privateProducts(restaurantId: string): Promise<DbProduct[]> {
    const { data, error } = await supabase.from('products')
      .select('id, restaurant_id, category_id, name, description, price_cents, emoji, tag, image_url, available, active, position')
      .eq('restaurant_id', restaurantId).order('position');
    if (error) throw new Error('No se pudieron consultar los productos.');
    return (data ?? []) as DbProduct[];
  }

  async changeAvailability(p: DbProduct): Promise<void> {
    const { error } = await supabase.from('products')
      .update({ available: !p.available }).eq('restaurant_id', p.restaurant_id).eq('id', p.id);
    if (error) throw new Error('No tienes permiso para modificar este producto.');
  }

  async changePrice(p: DbProduct, value: number): Promise<void> {
    const cents = Math.round(value * 100);
    if (!Number.isFinite(value) || !Number.isInteger(cents) || cents < 50 || cents > 10_000_000) {
      throw new Error('El precio debe ser un número válido desde S/0.50.');
    }
    const { error } = await supabase.from('products')
      .update({ price_cents: cents }).eq('restaurant_id', p.restaurant_id).eq('id', p.id);
    if (error) throw new Error('No tienes permiso para cambiar este precio.');
  }

  /** Categorías del restaurante; RLS permite borradores solo a los miembros. */
  async categoriesForRestaurant(restaurantId: string): Promise<DbCategory[]> {
    const { data, error } = await supabase.from('categories')
      .select('id, restaurant_id, name, position, active')
      .eq('restaurant_id', restaurantId).order('position');
    if (error) throw new Error('No se pudieron cargar las categorías.');
    return (data ?? []) as DbCategory[];
  }

  async addCategory(restaurantId: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean || clean.length > 80) throw new Error('La categoría debe tener de 1 a 80 caracteres.');
    const { data, error } = await supabase.from('categories')
      .insert({ restaurant_id: restaurantId, name: clean, active: true })
      .select('id').single();
    if (error || !data) throw new Error('No se pudo crear la categoría. Comprueba tus permisos.');
  }

  async saveProduct(restaurantId: string, draft: {
    id?: string; category_id: string; name: string; description: string;
    price: number; emoji: string; tag: string; active: boolean; available: boolean;
  }): Promise<void> {
    const name = draft.name.trim();
    const description = draft.description.trim();
    const emoji = draft.emoji.trim() || '🍽️';
    const tag = draft.tag.trim();
    const price_cents = Math.round(draft.price * 100);
    if (!name || name.length > 120) throw new Error('Nombre requerido (máximo 120 caracteres).');
    if (description.length > 1000 || emoji.length > 20 || tag.length > 50) {
      throw new Error('La descripción, el ícono o la etiqueta superan el límite permitido.');
    }
    if (!Number.isFinite(draft.price) || !Number.isInteger(price_cents) ||
        price_cents < 50 || price_cents > 10_000_000) {
      throw new Error('Ingresa un precio válido desde S/0.50.');
    }
    if (!draft.category_id) throw new Error('Selecciona una categoría.');
    const values = { category_id: draft.category_id, name, description,
      price_cents, emoji, tag, active: draft.active, available: draft.available };
    if (draft.id) {
      const { data, error } = await supabase.from('products')
        .update(values)
        .eq('id', draft.id).eq('restaurant_id', restaurantId)
        .select('id').single();
      if (error || !data) throw new Error('No se pudo editar el producto. Revisa permisos y categoría.');
    } else {
      const { data, error } = await supabase.from('products')
        .insert({ ...values, restaurant_id: restaurantId })
        .select('id').single();
      if (error || !data) throw new Error('No se pudo crear el producto. Revisa permisos y categoría.');
    }
  }

  async saveRestaurantSettings(restaurantId: string, values: {
    name: string; phone: string; opening_hours: string;
  }): Promise<RestaurantSummary> {
    const name = values.name.trim();
    const phone = values.phone.trim();
    const opening_hours = values.opening_hours.trim();
    if (name.length < 2 || name.length > 120 || phone.length > 20 || opening_hours.length > 160) {
      throw new Error('Comprueba el nombre, teléfono y horarios ingresados.');
    }
    // No permitimos activar accepting_orders desde este panel de desarrollo.
    const { data, error } = await supabase.from('restaurants')
      .update({ name, phone, opening_hours })
      .eq('id', restaurantId)
      .select('id, slug, name, phone, opening_hours, accepting_orders').single();
    if (error || !data) throw new Error('No se pudo actualizar el restaurante. Comprueba tu rol.');
    return data as RestaurantSummary;
  }
}
