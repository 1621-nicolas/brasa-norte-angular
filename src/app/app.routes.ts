import { Routes } from '@angular/router';
import { StorefrontComponent } from './public/storefront.component';
import { AdminComponent } from './admin/admin.component';
import { LiveCatalogComponent } from './public/live-catalog.component';
import { LoginComponent } from './auth/login.component';
import { LiveManagementComponent } from './admin/live-management.component';
import { restaurantAuthGuard } from './core/restaurant-auth.guard';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'r/brasa-norte' },
  { path: 'r/brasa-norte', component: StorefrontComponent, title: 'Brasa Norte | Menú de demostración' },
  { path: 'admin', pathMatch: 'full', redirectTo: 'gestion' },
  { path: 'demo/admin', component: AdminComponent, title: 'Brasa Norte | Panel DEMO' },
  { path: 'ingresar', component: LoginComponent, title: 'Brasa Norte | Acceso de restaurantes' },
  { path: 'gestion', component: LiveManagementComponent, canActivate: [restaurantAuthGuard], title: 'Brasa Norte | Gestión privada' },
  { path: 'catalogo/:slug', component: LiveCatalogComponent, title: 'Brasa Norte | Carta Supabase' },
  { path: '**', redirectTo: 'r/brasa-norte' }
];
