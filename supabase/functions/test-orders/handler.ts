/** Dependency-injected handler: tests exercise the same boundary deployed to Deno. */
export interface OrdersGateway {
  user(token: string): Promise<boolean>;
  command(
    token: string,
    action: string,
    restaurantId: string,
    payload: unknown,
  ): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: "Inicia sesión con una cuenta autorizada.",
  ACCESS_DENIED: "No tienes acceso a este restaurante.",
  OWNER_REQUIRED: "Solo el propietario puede configurar las pruebas.",
  TEST_ACCESS_REQUIRED:
    "Tu cuenta no está autorizada o las pruebas están pausadas.",
  TEST_MODE_DISABLED: "Las pruebas de este restaurante están pausadas.",
  INVALID_INPUT: "Revisa los datos de demostración.",
  INVALID_ITEMS: "Revisa los productos y cantidades (1–20).",
  INVALID_OPTIONS: "Un complemento ya no está disponible. Vuelve a la carta.",
  OPTION_BOUNDS:
    "Completa las opciones obligatorias y sus límites en la carta.",
  PRODUCT_UNAVAILABLE: "Un producto está agotado u oculto. Revisa la carta.",
  INVALID_ZONE: "La zona de reparto ya no está disponible.",
  INVALID_ADDRESS: "Usa una dirección ficticia de prueba.",
  INVALID_PICKUP: "El recojo no lleva dirección ni tarifa de reparto.",
  PRICE_CHANGED:
    "Los precios cambiaron. Actualiza el resumen antes de confirmar otra vez.",
  IDEMPOTENCY_CONFLICT:
    "Esta confirmación ya se utilizó con otros datos. Consulta los pedidos.",
  TEST_RATE_LIMIT: "Alcanzaste el límite de simulaciones. Inténtalo más tarde.",
  DUPLICATE_COMBINATION: "Agrupa las combinaciones iguales en el carrito.",
  ORDER_TOO_LARGE:
    "Reduce las cantidades. El máximo de simulación es S/10,000.",
  STALE_ORDER: "Otra persona actualizó el pedido. Actualiza la lista.",
  INVALID_TRANSITION: "Ese cambio de estado no está permitido.",
  CANCELLATION_REASON_REQUIRED: "Escribe un motivo breve para cancelar.",
  ORDER_NOT_FOUND: "El pedido no está disponible para tu cuenta.",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createHandler(gateway: OrdersGateway, origins: string[]) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (origin && origins.includes(origin))
      headers["Access-Control-Allow-Origin"] = origin;
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.includes(origin))
      return reply(403, {
        error: "Origen no autorizado.",
        code: "ORIGIN_DENIED",
      });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, { error: "Usa POST." });
    const auth = request.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ") || auth.length > 8192)
      return reply(401, {
        error: messages.AUTH_REQUIRED,
        code: "AUTH_REQUIRED",
      });
    if (!request.headers.get("content-type")?.includes("application/json"))
      return reply(415, { error: "Se requiere JSON." });
    try {
      const token = auth.slice(7);
      if (!(await gateway.user(token)))
        return reply(401, {
          error: messages.AUTH_REQUIRED,
          code: "AUTH_REQUIRED",
        });
      // Stream limit also protects requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: messages.INVALID_INPUT });
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 32768) {
          await reader.cancel();
          return reply(413, { error: "El pedido supera el tamaño permitido." });
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return reply(400, { error: messages.INVALID_INPUT });
      }
      if (
        !body ||
        Array.isArray(body) ||
        typeof body !== "object" ||
        Object.keys(body).some(
          (k) => !["action", "restaurant_id", "payload"].includes(k),
        ) ||
        !["create", "transition"].includes(String(body["action"])) ||
        !uuid.test(String(body["restaurant_id"]))
      )
        return reply(400, {
          error: messages.INVALID_INPUT,
          code: "INVALID_INPUT",
        });
      const result = await gateway.command(
        token,
        String(body["action"]),
        String(body["restaurant_id"]),
        body["payload"],
      );
      if (result.error) {
        const code = result.error.message;
        const status =
          result.error.code === "42501"
            ? 403
            : code === "TEST_RATE_LIMIT"
              ? 429
              : [
                    "PRICE_CHANGED",
                    "STALE_ORDER",
                    "IDEMPOTENCY_CONFLICT",
                  ].includes(code)
                ? 409
                : 400;
        return reply(status, {
          code: messages[code] ? code : "INVALID_INPUT",
          error: messages[code] ?? messages.INVALID_INPUT,
        });
      }
      return reply(200, { order: result.data });
    } catch {
      // Never log bearer tokens, request payloads or customer information.
      console.error("test-orders: upstream request failed");
      return reply(503, {
        error:
          "No se pudo contactar al servidor. Reintenta con la misma confirmación.",
        code: "SERVER_UNAVAILABLE",
      });
    }
  };
}
