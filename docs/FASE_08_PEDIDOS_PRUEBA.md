# Fase V0.8 — arquitectura y operación

## Flujo y límites

Angular mantiene un carrito provisional → Edge Function `test-orders` comprueba el JWT con `auth.getUser` → RPC pública invoker → rutina privada definer con autorización explícita → inserción atómica de pedido, líneas, complementos e historial.

La función se configura con `verify_jwt=false` por compatibilidad con las claves modernas de Supabase. **La autenticación no se omite:** el código valida cada token contra Auth, rechaza usuarios anónimos y propaga la identidad a PostgreSQL. Tampoco se usa una clave privilegiada para omitir RLS.

Límites: 32 KiB de JSON, 25 combinaciones por pedido, 1–20 unidades por combinación, 50 opciones por línea, S/10,000 por simulación, 30 pedidos nuevos por hora y cuenta dentro de un restaurante, 200 por restaurante en 24 horas. Los reintentos válidos de una clave existente no consumen otra cuota. Las combinaciones duplicadas en el mismo payload se rechazan.

CORS solo acepta `http://localhost:4200` y `http://127.0.0.1:4200` por defecto. Otro origen requiere configurar `TEST_ORDER_ALLOWED_ORIGINS` con una lista explícita separada por comas. CORS no sustituye autenticación: las solicitudes sin Origin también requieren JWT y autorización.

## Permisos

| Operación | Visitante | Miembro staff/manager | Propietario |
| --- | --- | --- | --- |
| Leer carta publicada | Sí | Sí | Sí |
| Leer/atender pruebas del restaurante | No | Sí, atención solo con modo habilitado | Sí |
| Crear pruebas | No | Solo con autorización adicional | Solo tras habilitar su cuenta |
| Habilitar/pausar simulaciones | No | No | Sí |
| Autorizar otro miembro como tester | No | No | Sí |
| Escribir directamente tablas de pedidos | No | No | No |
| Activar `accepting_orders` desde la API de cliente | No | No | No |

`private.test_order_access` contiene la autorización adicional. Tiene RLS y una política explícita de denegación, sin permisos de tabla para clientes. La función privada es la única que gestiona esa lista. El propietario que habilita pruebas se autoriza a sí mismo; no se autoriza automáticamente a toda la plantilla.

La RPC pública es `SECURITY INVOKER`; la rutina privada utiliza `SECURITY DEFINER`, `search_path=''`, SQL estático y comprobaciones de `auth.uid()`, pertenencia y rol. Su `EXECUTE` está revocado a PUBLIC/anon y concedido únicamente a authenticated. La rutina sigue validando todas las operaciones aunque alguien invoque la RPC directamente sin pasar por la Edge Function.

## Contrato

POST `/functions/v1/test-orders`, con JWT en Authorization, Content-Type JSON:

```json
{
  "action": "create",
  "restaurant_id": "UUID del restaurante autorizado",
  "payload": {
    "idempotency_key": "UUID generado una vez por confirmación",
    "customer_name": "Cliente de prueba A",
    "customer_phone": "900000000",
    "fulfillment": "pickup",
    "delivery_zone_id": null,
    "delivery_address": "",
    "delivery_reference": "",
    "notes": "Sin ají (simulación)",
    "simulation_confirmed": true,
    "expected_total_cents": 4380,
    "items": [{"product_id": "UUID", "quantity": 2, "option_ids": ["UUID"]}]
  }
}
```

`expected_total_cents` solo se compara con el precio recalculado, nunca se utiliza como importe autorizado. Un cambio devuelve `PRICE_CHANGED` y revierte toda la operación. Actualizar precios reconstruye el carrito con el catálogo vigente y solicita una nueva confirmación.

La acción `transition` recibe `order_id`, `expected_status`, `status` y `reason`. El servidor bloquea la fila, comprueba su restaurante y modo test, valida la transición y escribe actor/fecha/motivo. Repetir el estado actual devuelve el pedido sin otra entrada de historial. Un estado origen obsoleto devuelve `STALE_ORDER`.

La RPC `test_orders_command(p_action,p_restaurant_id,p_payload)` también ofrece `access`, `summary`, `configure` y `authorize`. Para autorizar un empleado que ya pertenece al restaurante, el propietario autenticado puede llamar desde una integración administrativa:

```ts
await supabase.rpc('test_orders_command', {
  p_action: 'authorize',
  p_restaurant_id: restaurantId,
  p_payload: { user_id: memberUserId, enabled: true }
});
```

La gestión visual de empleados/invitaciones queda para una siguiente versión; V0.8 permite habilitar la propia cuenta desde el panel y conserva este contrato seguro para ampliar el equipo.

## Estados

- Recojo: pendiente → confirmado → preparando → listo → entregado.
- Delivery: pendiente → confirmado → preparando → listo → en_camino → entregado.
- Se puede cancelar/rechazar desde pendiente, confirmado o preparando, con un motivo de 3–300 caracteres.
- Entregado y cancelado son finales. No se reabren en V0.8.

## Datos e idempotencia

`orders.is_test` es false para los datos previos y true solo cuando los crea la rutina de simulaciones. Los pedidos test exigen `payment_method='simulacion'`, `payment_status='no_aplica'`, creador, payload original, teléfono ficticio y prefijo TEST-. Nunca hay un proveedor de pagos conectado.

Se conservan nombre del plato, precio base, precio unitario con extras, subtotal, complementos, zona y tarifa al confirmar. Cambiar el catálogo no altera un pedido existente. Todos los reportes comerciales futuros deben filtrar **`is_test=false`**; la V0.8 filtra únicamente true.

La restricción existente `(restaurant_id,idempotency_key)` se reutiliza. Un bloqueo transaccional por restaurante serializa creación, cuotas y reintentos. Misma clave/autor/payload devuelve el mismo pedido; la misma clave con otros datos produce conflicto. El navegador conserva la confirmación pendiente en memoria y sessionStorage para reintentar después de una pérdida de respuesta o navegación. No almacena claves privadas ni información de clientes reales.

## Actualización y rendimiento

El panel consulta páginas de 20 pedidos, ordenadas por fecha descendente y luego ID. Filtra por estado y código. La agregación de estadísticas se hace en PostgreSQL e incluye todos los tests del restaurante, no solo la página visible. El importe mostrado incluye cancelados y se identifica como simulación.

Consulta periódica cada 30 segundos, pausada en pestañas ocultas, con espera creciente de hasta 120 segundos si falla. Se limpia el temporizador al salir; se descartan respuestas de un restaurante anterior. La vista de detalle se actualiza cuando no hay una acción en confirmación. No hay Realtime, sockets ni servicios de pago adicionales.

## Migraciones y compatibilidad

Las migraciones V0.8 añaden columnas/índices y amplían las restricciones de pagos; no borran filas ni duplican las tablas de pedidos. Antes de aplicar se verificó que las restricciones previas existían y que había cero pedidos. Se probó primero desde cero en PGlite y luego en PostgreSQL remoto con fixtures reversibles.

| Archivo local | Versión registrada en BRASANORTE |
| --- | --- |
| `20261019010000_initial_multitenant.sql` | `20261019114211` |
| `20261019020000_catalog_media_options.sql` | `20261019190947` |
| `20261020025745_test_orders_v08.sql` | `20261020030424` |
| `20261020030834_test_access_explicit_deny.sql` | `20261020030940` |
| `20261020115520_canonical_test_order_combinations.sql` | `20261020115603` |

Las fechas remotas proceden de las aplicaciones mediante el conector. **No ejecutes `supabase db push` ni `db reset` sobre el proyecto conectado sin reconciliar antes ese historial.** No se alteró automáticamente el historial histórico. El checkout local de Angular no requiere ningún push de base de datos. Las migraciones locales sí se aplican ordenadamente sobre un entorno vacío en `npm run test:db`.

Para futuros despliegues: comprobar `supabase migration list --linked`, comparar SQL y estado real, y reconciliar con `supabase migration repair` solo las versiones equivalentes verificadas. Respaldar primero si el proyecto ya contiene datos que no sean de prueba. No volver a ejecutar estas migraciones en el proyecto actual.

Para desplegar el código de la función en otro entorno autorizado, después de revisar su proyecto destino:

```powershell
npx supabase functions deploy test-orders --project-ref TU_PROJECT_REF
```

El proyecto cliente actual y la validación de URLs de fotos están fijados a BRASANORTE desde versiones anteriores. Adaptar ambas configuraciones es necesario al usar otro proyecto.

## Verificación y límites conocidos

- Las pruebas SQL del repositorio se ejecutaron en PGlite y en el PostgreSQL 17 de BRASANORTE. Se crean dos restaurantes, cuatro usuarios ficticios y sus datos dentro de BEGIN/ROLLBACK. No se dejan usuarios ni pedidos de prueba permanentes.
- La batería de navegador usa transporte simulado. Valida componentes reales, navegación, formulario, carrito, aceptación e historial en escritorio/móvil; no equivale a un login real de propietario contra Supabase.
- La función desplegada se comprobó por HTTP sin sesión (401). No se usó la contraseña del propietario ni se hizo un flujo HTTP autenticado real.
- No se realizó una prueba de carga ni un ensayo simultáneo de varias sesiones PostgreSQL. La protección de concurrencia descansa en la restricción única y los bloqueos explícitos, además de las pruebas de reintento secuencial.
- No hay borrado automático de pedidos históricos ni limpieza comercial. Se mantiene trazabilidad; definir una política de retención antes de crecer.
- La advertencia preexistente de Supabase sobre contraseñas filtradas continúa: esa protección no está incluida en Free. No se contrató un plan para activarla.
