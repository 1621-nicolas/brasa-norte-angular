import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RestaurantApiService } from './restaurant-api.service';

/** Protección visual de la ruta; la autorización real se hace en RLS. */
export const restaurantAuthGuard: CanActivateFn = async () => {
  const api = inject(RestaurantApiService);
  const router = inject(Router);
  try {
    const memberships = await api.memberships();
    return memberships.length ? true : router.createUrlTree(['/ingresar']);
  } catch {
    return router.createUrlTree(['/ingresar']);
  }
};
