import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RestaurantApiService } from '../core/restaurant-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <main class="cloud-page">
    <section class="cloud-panel auth-panel">
      <a routerLink="/r/brasa-norte" class="cloud-back">← Volver a la demostración</a>
      <div class="section-kicker">ACCESO DE RESTAURANTES</div>
      <h1>Bienvenido a Brasa Norte</h1>
      <p>Entra con tu cuenta autorizada para administrar tus productos desde Supabase.</p>
      <form (ngSubmit)="login()" class="cloud-form">
        <label class="field">Correo electrónico
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="username"
            maxlength="254" placeholder="correo@restaurante.com">
        </label>
        <label class="field">Contraseña
          <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password"
            placeholder="Tu contraseña">
        </label>
        @if (error) { <div class="micro-banner" role="alert">{{ error }}</div> }
        <button type="submit" class="btn btn-primary" [disabled]="busy">
          {{ busy ? 'Verificando...' : 'Ingresar al panel' }}
        </button>
      </form>
      <p class="cloud-note">Solo administradores invitados. No hay registro público de propietarios.</p>
    </section>
  </main>`
})
export class LoginComponent {
  readonly api = inject(RestaurantApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  email = '';
  password = '';
  busy = false;
  error = '';

  async login(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      await this.api.signIn(this.email.trim(), this.password);
      const memberships = await this.api.memberships();
      if (!memberships.length) {
        await this.api.signOut();
        throw new Error('Tu cuenta no está asignada a ningún restaurante.');
      }
      this.password = '';
      await this.router.navigateByUrl('/gestion');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'No se pudo ingresar.';
    } finally { this.busy = false; this.cdr.markForCheck(); }
  }
}
