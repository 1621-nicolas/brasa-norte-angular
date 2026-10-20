import {
  TestCheckoutDraftService,
  PendingTestOrder,
} from "../core/test-checkout-draft.service";
import {
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  CatalogCartService,
  buildCatalogCartLine,
} from "../core/catalog-cart.service";
import {
  PublicMenu,
  RestaurantApiService,
} from "../core/restaurant-api.service";
import { TestOrderError, TestOrdersService } from "../core/test-orders.service";
import {
  DeliveryZone,
  TestAccess,
  TestCheckout,
  TestOrder,
  checkoutErrors,
  money,
  orderPayload,
} from "../core/test-orders.models";
@Component({
  selector: "app-test-checkout",
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: "./test-checkout.component.html",
})
export class TestCheckoutComponent implements OnInit {
  readonly menu = input.required<PublicMenu>();
  readonly back = output<void>();
  readonly processing = output<boolean>();
  readonly cart = inject(CatalogCartService);
  private readonly api = inject(TestOrdersService);
  private readonly catalog = inject(RestaurantApiService);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly refreshing = signal(false);
  readonly access = signal<TestAccess | null>(null);
  readonly zones = signal<DeliveryZone[]>([]);
  readonly errors = signal<string[]>([]);
  readonly success = signal<TestOrder | null>(null);
  readonly uncertain = signal(false);
  readonly notice = signal("");
  private readonly drafts = inject(TestCheckoutDraftService);
  private pending: PendingTestOrder | null = null;
  form: TestCheckout = {
    customer_name: "Cliente de prueba A",
    customer_phone: "900000000",
    fulfillment: "pickup",
    delivery_zone_id: "",
    delivery_address: "Dirección de prueba A",
    delivery_reference: "",
    notes: "",
    simulation_confirmed: false,
  };
  readonly price = money;
  async ngOnInit() {
    this.pending = this.drafts.get(this.menu().restaurant.id);
    if (this.pending) {
      this.uncertain.set(true);
      this.processing.emit(true);
      this.notice.set(
        "Existe una confirmación pendiente. Reintenta para recuperar su resultado sin duplicarla.",
      );
    }
    try {
      const [access, zones] = await Promise.all([
        this.api.access(this.menu().restaurant.id),
        this.api.zones(this.menu().restaurant.id),
      ]);
      this.access.set(access);
      this.zones.set(zones);
    } catch {
      this.errors.set([
        "Inicia sesión con una cuenta del restaurante para comprobar tu acceso a las pruebas.",
      ]);
    } finally {
      this.loading.set(false);
    }
  }
  fee(): number {
    return this.form.fulfillment === "delivery"
      ? (this.zones().find((z) => z.id === this.form.delivery_zone_id)
          ?.fee_cents ?? 0)
      : 0;
  }
  total(): number {
    return this.cart.subtotalCents() + this.fee();
  }
  async refreshPrices() {
    if (this.busy() || this.uncertain()) return;
    this.refreshing.set(true);
    this.errors.set([]);
    try {
      const menu = await this.catalog.publicMenu(this.menu().restaurant.slug);
      if (!menu) throw new Error("La carta ya no está publicada.");
      const lines = this.cart.lines().map((l) => {
        const choices: Record<string, string[]> = {};
        for (const o of l.options) (choices[o.groupId] ??= []).push(o.id);
        return buildCatalogCartLine(
          menu,
          l.productId,
          choices,
          l.quantity,
          l.id,
        );
      });
      const zones = await this.api.zones(menu.restaurant.id);
      this.cart.lines.set(lines);
      this.zones.set(zones);
      this.pending = null;
      this.form.simulation_confirmed = false;
      this.notice.set(
        "Resumen actualizado. Revisa los importes y confirma la simulación de nuevo.",
      );
    } catch (err) {
      this.errors.set([
        err instanceof Error ? err.message : "No se pudo actualizar.",
      ]);
    } finally {
      this.refreshing.set(false);
    }
  }
  async submit() {
    if (
      this.busy() ||
      this.refreshing() ||
      !this.access()?.can_create ||
      this.success()
    )
      return;
    this.errors.set([]);
    this.notice.set("");
    if (!this.uncertain()) {
      const errors = checkoutErrors(this.form, this.zones(), this.cart.lines());
      if (errors.length) {
        this.errors.set(errors);
        return;
      }
      const value = orderPayload(
        this.form,
        this.cart.lines(),
        "",
        this.total(),
      );
      const fingerprint = JSON.stringify(value);
      if (this.pending?.fingerprint !== fingerprint) {
        const key = crypto.randomUUID();
        this.pending = {
          key,
          fingerprint,
          payload: { ...value, idempotency_key: key },
        };
      }
    }
    if (!this.pending) return;
    this.drafts.set(this.menu().restaurant.id, this.pending);
    this.busy.set(true);
    this.processing.emit(true);
    try {
      const order = await this.api.submit(
        this.menu().restaurant.id,
        this.pending.payload,
      );
      this.success.set(order);
      this.drafts.clear(this.menu().restaurant.id);
      this.cart.clear();
      this.pending = null;
      this.uncertain.set(false);
    } catch (err) {
      this.errors.set([
        err instanceof Error ? err.message : "No se pudo confirmar.",
      ]);
      // A lost response must retry the identical payload even if the cart changed.
      this.uncertain.set(
        !(err instanceof TestOrderError) ||
          ["NETWORK", "SERVER_UNAVAILABLE"].includes(err.code),
      );
      if (!this.uncertain()) this.drafts.clear(this.menu().restaurant.id);
    } finally {
      this.busy.set(false);
      this.processing.emit(this.uncertain());
    }
  }
}
