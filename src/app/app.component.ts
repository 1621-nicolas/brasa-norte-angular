import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { DemoStoreService } from "./core/demo-store.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="demo-banner">
      <span class="banner-dot"></span> DEMOSTRACIÓN ANGULAR · Sin pedidos ni
      pagos reales · Solo datos ficticios
    </div>
    @if (isDemoRoute()) {
      <header class="site-header">
        <div class="container header-inner">
          <a
            class="brand"
            routerLink="/r/brasa-norte"
            aria-label="Brasa Norte, volver al inicio"
            ><span class="brand-mark">✦</span
            ><span
              ><strong>BRASA<span class="brand-second">NORTE</span></strong
              ><small>POLLERÍA & BURGERS</small></span
            ></a
          >
          <nav class="nav-links" aria-label="Navegación principal">
            <a href="/r/brasa-norte#menu">Menú</a
            ><a href="/r/brasa-norte#como-pedir">¿Cómo pedir?</a
            ><a routerLink="/admin">Panel restaurante ↗</a>
          </nav>
          <button
            class="cart-trigger"
            type="button"
            (click)="store.cartOpen.set(true)"
            aria-label="Abrir carrito"
          >
            🛒 <span class="cart-trigger-text">Mi pedido</span
            ><span class="cart-count">{{ store.cartCount() }}</span>
          </button>
        </div>
      </header>
    }
    <router-outlet />
    @if (isDemoRoute()) {
      <footer class="site-footer">
        <div class="container footer-inner">
          <div>
            <strong>✦ BRASANORTE</strong>
            <p>
              Una demostración de plataforma de pedidos para negocios
              gastronómicos.
            </p>
          </div>
          <div>Angular · Prototipo · Sin pagos ni pedidos reales</div>
        </div>
      </footer>
    }
  `,
})
export class AppComponent {
  readonly store = inject(DemoStoreService);
  private readonly router = inject(Router);
  isDemoRoute(): boolean { return this.router.url === "/" || this.router.url.startsWith("/r/brasa-norte"); }
  inAdmin(): boolean {
    return this.router.url.startsWith("/admin");
  }
}
