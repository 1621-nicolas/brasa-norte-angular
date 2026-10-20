import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TestOrdersComponent } from "./test-orders.component";
import { TestOrdersService } from "../core/test-orders.service";
import { TestOrder } from "../core/test-orders.models";
const order = {
  id: "order",
  restaurant_id: "a",
  code: "TEST-1",
  status: "pendiente",
  is_test: true,
  created_at: "2026-10-20T03:00:00Z",
  updated_at: "2026-10-20T03:00:00Z",
  customer_name: "Cliente de prueba A",
  customer_phone: "900000000",
  fulfillment: "pickup",
  total_cents: 1890,
  delivery_fee_cents: 0,
} as TestOrder;
afterEach(() => vi.useRealTimers());
async function setup(role = "owner") {
  const api = {
    list: vi.fn().mockResolvedValue({ orders: [order], count: 1 }),
    summary: vi
      .fn()
      .mockResolvedValue({
        counts: { pendiente: 1 },
        total_cents: 1890,
        order_count: 1,
      }),
    access: vi
      .fn()
      .mockResolvedValue({ enabled: true, can_create: true, role }),
    detail: vi.fn().mockResolvedValue({ order, items: [], history: [] }),
    transition: vi.fn().mockResolvedValue({ ...order, status: "confirmado" }),
    configure: vi.fn().mockResolvedValue({ enabled: false }),
  };
  await TestBed.configureTestingModule({
    imports: [TestOrdersComponent],
    providers: [
      provideRouter([]),
      { provide: TestOrdersService, useValue: api },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TestOrdersComponent);
  fixture.componentRef.setInput("restaurantId", "a");
  fixture.componentRef.setInput("slug", "brasa-norte");
  fixture.componentRef.setInput("role", role);
  fixture.detectChanges();
  await vi.waitFor(() =>
    expect(fixture.componentInstance.loading()).toBe(false),
  );
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, api };
}
describe("test orders management", () => {
  it("lists test orders, totals and explicit status labels", async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain("Cliente de prueba A");
    expect(fixture.nativeElement.textContent).toContain("S/18.90");
    expect(fixture.nativeElement.textContent).toContain("Nuevos");
    fixture.destroy();
  });
  it("staff can attend but cannot configure simulations", async () => {
    const { fixture, page, api } = await setup("staff");
    await page.configure();
    expect(api.configure).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain(
      "Pausar simulaciones",
    );
    await page.openDetail(order);
    page.stage("confirmado");
    await page.applyStatus();
    expect(api.transition).toHaveBeenCalledWith("a", order, "confirmado", "");
    fixture.destroy();
  });
  it("requires cancellation reason", async () => {
    const { fixture, page, api } = await setup();
    await page.openDetail(order);
    page.stage("cancelado");
    await page.applyStatus();
    expect(api.transition).not.toHaveBeenCalled();
    expect(page.error()).toContain("motivo");
    fixture.destroy();
  });
  it("filters and resets pagination", async () => {
    const { fixture, page, api } = await setup();
    page.page = 3;
    page.status = "listo";
    page.search = "TEST-1";
    page.filter();
    await vi.waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith("a", "listo", "TEST-1", 0),
    );
    fixture.destroy();
  });
  it("does not retain a previous restaurant response", async () => {
    const { fixture, page, api } = await setup();
    let resolve!: (value: unknown) => void;
    api.list.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    void page.refresh();
    fixture.componentRef.setInput("restaurantId", "b");
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith("b", "", "", 0),
    );
    api.list.mockResolvedValue({ orders: [], count: 0 });
    await page.refresh();
    resolve({ orders: [order], count: 1 });
    await Promise.resolve();
    expect(page.orders()).toEqual([]);
    fixture.destroy();
  });
  it("cleans polling on destroy", async () => {
    const { fixture, api } = await setup();
    vi.useFakeTimers();
    const before = api.list.mock.calls.length;
    fixture.destroy();
    await vi.advanceTimersByTimeAsync(120000);
    expect(api.list).toHaveBeenCalledTimes(before);
  });
});
