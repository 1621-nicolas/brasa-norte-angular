import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, it, expect, vi } from "vitest";
import { TestCheckoutComponent } from "./test-checkout.component";
import { TestOrdersService, TestOrderError } from "../core/test-orders.service";
import { CatalogCartService } from "../core/catalog-cart.service";
import { PublicMenu } from "../core/restaurant-api.service";
const menu: PublicMenu = {
  restaurant: {
    id: "rest",
    slug: "brasa-norte",
    name: "Brasa",
    phone: "",
    opening_hours: "",
    accepting_orders: false,
  },
  products: [],
  categories: [],
  groups: [],
  options: [],
};
async function setup(canCreate = true) {
  sessionStorage.clear();
  const api = {
    access: vi
      .fn()
      .mockResolvedValue({
        enabled: canCreate,
        can_create: canCreate,
        role: "owner",
      }),
    zones: vi
      .fn()
      .mockResolvedValue([{ id: "zone", name: "Zona", fee_cents: 500 }]),
    submit: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [TestCheckoutComponent],
    providers: [
      provideRouter([]),
      { provide: TestOrdersService, useValue: api },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TestCheckoutComponent);
  fixture.componentRef.setInput("menu", menu);
  const cart = TestBed.inject(CatalogCartService);
  cart.lines.set([
    {
      id: "line",
      restaurantId: "rest",
      productId: "prod",
      name: "Pollo",
      emoji: "",
      imageUrl: null,
      quantity: 1,
      basePriceCents: 1890,
      options: [],
      signature: "",
      unitPriceCents: 1890,
    },
  ]);
  fixture.detectChanges();
  await vi.waitFor(() =>
    expect(fixture.componentInstance.loading()).toBe(false),
  );
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, api, cart };
}
describe("test checkout component", () => {
  it("shows restricted access without a fake payment form", async () => {
    const { fixture } = await setup(false);
    expect(fixture.nativeElement.textContent).toContain(
      "Pruebas reservadas al equipo",
    );
    expect(fixture.nativeElement.querySelector("form")).toBeNull();
  });
  it("invalid consent does not send a request", async () => {
    const { component, api, fixture } = await setup();
    await component.submit();
    fixture.detectChanges();
    expect(api.submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      "Confirma que la información es ficticia",
    );
  });
  it("switching to delivery renders zone and computes fee", async () => {
    const { component, fixture } = await setup();
    fixture.nativeElement.querySelector("input[value=delivery]").click();
    await fixture.whenStable();
    component.form.delivery_zone_id = "zone";
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(component.total()).toBe(2390);
    expect(fixture.nativeElement.textContent).toContain("Dirección ficticia");
  });
  it("blocks double submission and empties cart only after success", async () => {
    const { component, api, cart } = await setup();
    component.form.simulation_confirmed = true;
    let resolve!: (value: unknown) => void;
    api.submit.mockImplementation(() => new Promise((r) => (resolve = r)));
    const first = component.submit();
    await component.submit();
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(component.busy()).toBe(true);
    expect(cart.lines()).toHaveLength(1);
    resolve({ id: "order", code: "TEST-1", total_cents: 1890 });
    await first;
    expect(cart.lines()).toHaveLength(0);
    expect(component.success()?.id).toBe("order");
  });
  it("retries identical key and payload after lost response", async () => {
    const { component, api } = await setup();
    component.form.simulation_confirmed = true;
    api.submit
      .mockRejectedValueOnce(new TestOrderError("Red", "NETWORK"))
      .mockResolvedValueOnce({ id: "order", total_cents: 1890 });
    await component.submit();
    const original = api.submit.mock.calls[0][1];
    component.form.notes = "changed after timeout";
    await component.submit();
    expect(api.submit.mock.calls[1][1]).toEqual(original);
  });
  it("shows server errors and keeps selection", async () => {
    const { component, api, cart } = await setup();
    component.form.simulation_confirmed = true;
    api.submit.mockRejectedValue(
      new TestOrderError("Los precios cambiaron", "PRICE_CHANGED"),
    );
    await component.submit();
    expect(component.errors()).toContain("Los precios cambiaron");
    expect(cart.lines()).toHaveLength(1);
    expect(component.uncertain()).toBe(false);
  });
});
