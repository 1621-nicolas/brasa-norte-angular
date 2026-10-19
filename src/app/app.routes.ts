import { Routes } from '@angular/router';
import { StorefrontComponent } from './public/storefront.component';
import { AdminComponent } from './admin/admin.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'r/brasa-norte' },
  { path: 'r/brasa-norte', component: StorefrontComponent, title: 'Brasa Norte | Menú de demostración' },
  { path: 'admin', component: AdminComponent, title: 'Brasa Norte | Panel DEMO' },
  { path: '**', redirectTo: 'r/brasa-norte' }
];
