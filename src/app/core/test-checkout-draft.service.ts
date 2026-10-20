import { Injectable } from "@angular/core";
import { orderPayload } from "./test-orders.models";
export interface PendingTestOrder {
  key: string;
  fingerprint: string;
  payload: ReturnType<typeof orderPayload>;
}
/** Fictitious data only. Retains a retry across route changes and browser reloads. */
@Injectable({ providedIn: "root" })
export class TestCheckoutDraftService {
  private memory = new Map<string, PendingTestOrder>();
  get(id: string): PendingTestOrder | null {
    if (this.memory.has(id)) return this.memory.get(id)!;
    try {
      const value = JSON.parse(
        sessionStorage.getItem("brasa_test_pending_" + id) ?? "null",
      );
      if (
        value?.key &&
        value?.payload?.idempotency_key === value.key &&
        Array.isArray(value.payload.items)
      ) {
        this.memory.set(id, value);
        return value;
      }
    } catch {
      /* Restricted browser storage; in-memory retry still works. */
    }
    return null;
  }
  set(id: string, value: PendingTestOrder) {
    this.memory.set(id, value);
    try {
      sessionStorage.setItem("brasa_test_pending_" + id, JSON.stringify(value));
    } catch {
      /* in-memory fallback */
    }
  }
  clear(id: string) {
    this.memory.delete(id);
    try {
      sessionStorage.removeItem("brasa_test_pending_" + id);
    } catch {
      /* in-memory fallback */
    }
  }
}
