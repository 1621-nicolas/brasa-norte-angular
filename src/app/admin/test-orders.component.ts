import {
  Component,
  HostListener,
  OnChanges,
  OnDestroy,
  inject,
  input,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { TestOrdersService } from "../core/test-orders.service";
import { OrderStatus } from "../core/models";
import {
  OrderDetail,
  OrderSummary,
  TestAccess,
  TestOrder,
  TEST_STATUS_LABELS,
  TEST_STATUSES,
  canCancelTestOrder,
  money,
  nextTestStatus,
} from "../core/test-orders.models";
@Component({
  selector: "app-test-orders",
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: "./test-orders.component.html",
})
export class TestOrdersComponent implements OnChanges, OnDestroy {
  readonly restaurantId = input.required<string>();
  readonly slug = input.required<string>();
  readonly role = input.required<string>();
  private readonly api = inject(TestOrdersService);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private detailGeneration = 0;
  private destroyed = false;
  private failures = 0;
  readonly orders = signal<TestOrder[]>([]);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly detail = signal<OrderDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly access = signal<TestAccess | null>(null);
  readonly summary = signal<OrderSummary>({
    counts: {},
    total_cents: 0,
    order_count: 0,
  });
  readonly updated = signal<Date | null>(null);
  readonly pendingStatus = signal<OrderStatus | null>(null);
  status: OrderStatus | "" = "";
  search = "";
  page = 0;
  reason = "";
  readonly labels = TEST_STATUS_LABELS;
  readonly statuses = TEST_STATUSES;
  readonly price = money;
  readonly next = nextTestStatus;
  readonly canCancel = canCancelTestOrder;
  ngOnChanges() {
    this.generation++;
    this.detailGeneration++;
    clearTimeout(this.timer);
    this.page = 0;
    this.orders.set([]);
    this.detail.set(null);
    this.access.set(null);
    this.summary.set({ counts: {}, total_cents: 0, order_count: 0 });
    this.pendingStatus.set(null);
    void this.refresh();
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.generation++;
    this.detailGeneration++;
    clearTimeout(this.timer);
  }
  @HostListener("document:visibilitychange") onVisibility() {
    if (!document.hidden && !this.busy()) void this.refresh();
  }
  @HostListener("window:online") onOnline() {
    if (!this.busy()) void this.refresh();
  }
  async refresh() {
    if (this.destroyed) return;
    clearTimeout(this.timer);
    const run = ++this.generation;
    const id = this.restaurantId();
    if (!this.updated()) this.loading.set(true);
    try {
      const [result, summary, access] = await Promise.all([
        this.api.list(id, this.status, this.search, this.page),
        this.api.summary(id),
        this.api.access(id),
      ]);
      if (run !== this.generation || this.destroyed) return;
      this.orders.set(result.orders);
      this.count.set(result.count);
      this.summary.set(summary);
      this.access.set(access);
      this.updated.set(new Date());
      this.error.set("");
      this.failures = 0;
      const detail = this.detail();
      if (detail && !this.busy() && !this.pendingStatus())
        await this.openDetail(detail.order, false);
    } catch (err) {
      if (run === this.generation) {
        this.error.set(this.message(err));
        this.failures++;
      }
    } finally {
      if (run === this.generation && !this.destroyed) {
        this.loading.set(false);
        this.schedule();
      }
    }
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        if (document.hidden || this.busy()) {
          this.schedule();
          return;
        }
        void this.refresh();
      },
      Math.min(120000, 30000 * 2 ** this.failures),
    );
  }
  filter() {
    this.page = 0;
    void this.refresh();
  }
  changePage(delta: number) {
    this.page = Math.max(0, this.page + delta);
    void this.refresh();
  }
  async openDetail(order: TestOrder, reset = true) {
    const run = ++this.detailGeneration;
    const id = this.restaurantId();
    if (reset) {
      this.pendingStatus.set(null);
      this.reason = "";
      this.detail.set(null);
    }
    this.detailLoading.set(true);
    try {
      const detail = await this.api.detail(id, order.id);
      if (run === this.detailGeneration && !this.destroyed)
        this.detail.set(detail);
    } catch (err) {
      if (run === this.detailGeneration) this.error.set(this.message(err));
    } finally {
      if (run === this.detailGeneration) this.detailLoading.set(false);
    }
  }
  closeDetail() {
    if (this.busy()) return;
    this.detailGeneration++;
    this.detail.set(null);
    this.detailLoading.set(false);
    this.pendingStatus.set(null);
  }
  stage(status: OrderStatus) {
    this.pendingStatus.set(status);
    this.reason = "";
    this.error.set("");
  }
  async applyStatus() {
    const detail = this.detail();
    const status = this.pendingStatus();
    if (!detail || !status || this.busy()) return;
    if (status === "cancelado" && this.reason.trim().length < 3) {
      this.error.set("Escribe un motivo de al menos tres caracteres.");
      return;
    }
    const id = this.restaurantId();
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    clearTimeout(this.timer);
    try {
      await this.api.transition(id, detail.order, status, this.reason.trim());
      if (this.destroyed || id !== this.restaurantId()) return;
      this.pendingStatus.set(null);
      this.notice.set(
        "Estado actualizado. El cambio quedó registrado en el historial.",
      );
      await this.openDetail(detail.order, false);
    } catch (err) {
      if (id === this.restaurantId()) this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
      this.schedule();
    }
    // Preserve an action error while updating list/statistics.
    const actionError = this.error();
    await this.refresh();
    if (actionError) this.error.set(actionError);
  }
  async configure() {
    if (this.busy() || this.role() !== "owner" || !this.access()) return;
    this.busy.set(true);
    this.error.set("");
    const id = this.restaurantId();
    try {
      await this.api.configure(id, !this.access()!.enabled);
      this.notice.set(
        "Configuración de simulaciones actualizada. Los pedidos comerciales siguen desactivados.",
      );
    } catch (err) {
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
    const actionError = this.error();
    await this.refresh();
    if (actionError) this.error.set(actionError);
  }
  actionLabel(status: OrderStatus): string {
    return {
      confirmado: "Aceptar pedido",
      preparando: "Comenzar preparación",
      listo: "Marcar como listo",
      en_camino: "Simular salida a reparto",
      entregado: "Finalizar simulación",
      cancelado: "Cancelar pedido",
      pendiente: "Nuevo pedido",
    }[status];
  }
  private message(err: unknown) {
    return err instanceof Error
      ? err.message
      : "No fue posible completar la operación.";
  }
}
