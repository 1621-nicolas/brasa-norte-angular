# Informe de entrega — Brasa Norte V0.8

Fecha de trabajo: 19–20 de octubre de 2026. Base: `main` en `3108937` (V0.7). Rama: `feat/v0.8-test-orders`.

## 1. Funcionalidades implementadas

Checkout de recojo/delivery con datos ficticios, autorización adicional para testers, total validado por PostgreSQL, pedidos y detalles atómicos, idempotencia, snapshots históricos, atención y cancelación con historial, búsqueda/paginación/estadísticas y actualización periódica. El catálogo, los combos, las fotos y el carrito V0.7 siguen disponibles. No se habilitó una operación comercial.

## 2. Archivos creados y modificados

| Área | Archivos |
| --- | --- |
| Checkout | `src/app/public/test-checkout.component.{ts,html,spec.ts}` |
| Panel de pedidos | `src/app/admin/test-orders.component.{ts,html,spec.ts}` |
| Contratos/validaciones | `src/app/core/test-orders.models.ts`, `.spec.ts` |
| Acceso API | `src/app/core/test-orders.service.ts` |
| Recuperación de confirmación | `src/app/core/test-checkout-draft.service.ts` |
| Integración existente | `live-catalog.component.{ts,html}`, `live-management.component.{ts,html}`, `src/styles.css` |
| Servidor | `supabase/functions/test-orders/index.ts`, `handler.ts`, `supabase/config.toml` |
| PostgreSQL | `20261020025745_test_orders_v08.sql`, `20261020030834_test_access_explicit_deny.sql`, `20261020115520_canonical_test_order_combinations.sql` |
| Pruebas | `supabase/tests/test_orders.sql`, `scripts/test-database.mjs`, `scripts/test-edge.test.ts`, `e2e/test-orders.spec.ts`, `playwright.config.ts` |
| Automatización/instalación | `.github/workflows/angular-ci.yml`, `package.json`, `package-lock.json`, `.gitignore` |
| Documentación | `README.md`, `docs/FASE_08_PEDIDOS_PRUEBA.md`, este informe |

## 3. Migraciones PostgreSQL

Se reutilizaron las tablas `orders`, `order_items`, `order_item_options` y `order_status_history`. Se añadieron indicador test, creador, payload idempotente, snapshots, referencia, fecha de actualización e índices. La autorización adicional vive en una tabla privada con RLS. Se revocó el permiso de cliente para activar `accepting_orders`.

Las tres migraciones se aplicaron satisfactoriamente en BRASANORTE. Las versiones remotas son `20261020030424`, `20261020030940` y `20261020115603`. No se borraron datos ni se ejecutó un reset. La correspondencia del historial completo está en la guía técnica.

## 4. Backend

Edge Function `test-orders` desplegada y activa. Autenticación online, CORS explícito, límites de cuerpo, errores controlados y cliente Supabase con JWT del solicitante. RPC pública invoker y rutina privada con autorización explícita. La rutina valida productos/categorías/opciones/zonas vigentes, cantidades, mínimos/máximos y cuota; recalcula precios, compara el total provisional y registra todo en una transacción.

Los reintentos reutilizan clave y payload; la creación usa bloqueo por restaurante y las transiciones bloqueo de fila. No hay claves `service_role` en Angular ni en esta función.

## 5. Frontend

Checkout integrado en la carta conectada. Selecciones ficticias precargadas, consentimiento, modo entrega, zonas, actualización de precios, mensajes de error y recibo final con código. El botón de confirmación se bloquea durante el envío. Una respuesta perdida conserva la misma operación entre rutas y recargas.

Gestión incluye resumen por siete estados, importe simulado acumulado, páginas de 20 pedidos, filtro, búsqueda por código, detalle de productos/extras, transición confirmada e historial. La hora se muestra en Perú. Las consultas se pausan en pestañas ocultas, se limpian al salir y descartan respuestas de restaurantes anteriores.

## 6. UI/UX

Se conservaron fondo crema, rojo ladrillo, tipografías, tarjetas y sidebar. El carrito muestra la foto del producto con emoji alternativo, nombres naturales de complementos, importes provisionales y un botón funcional de revisión. Se corrigió la apariencia desactivada heredada de ese botón y el desbordamiento del menú móvil. Los estados tienen texto además de color; formularios con labels, focos visibles, mensajes accesibles y diseño responsive.

Revisión visual en escritorio 1440 × 1000 y perfil móvil iPhone 13 con Chromium. La batería verificó ausencia de scroll horizontal en checkout y gestión. Las capturas de prueba usan información ficticia.

## 7. Pruebas ejecutadas

| Comprobación | Resultado local |
| --- | --- |
| Baseline V0.7 | Build correcto y 17 pruebas aprobadas |
| `npm run build` V0.8 | Correcto; bundle inicial 688.59 kB, dentro del presupuesto de 750 kB |
| `npm test` | 34/34 aprobadas |
| `npm run test:edge` | 9/9 aprobadas |
| `npm run test:db` | Migraciones y 48 aserciones/rechazos SQL aprobados en PGlite |
| Misma batería SQL en Supabase PostgreSQL 17 | Aprobada, con ROLLBACK de fixtures |
| `npm run test:e2e` | 8/8 aprobadas: cuatro recorridos en escritorio y móvil |
| Endpoint remoto sin sesión | HTTP 401 / AUTH_REQUIRED |
| `git diff --check` | Sin errores de espacios |
| Detector de diseño en archivos afectados | Sin hallazgos |

Las pruebas E2E interceptan la API; no equivalen a un pedido autenticado real contra Supabase. PGlite ejecuta las migraciones de aplicación sin modificarlas, pero simula los objetos de sistema `auth` y `storage`. La prueba remota cubrió la lógica PostgreSQL real. No se atribuyen a esas pruebas resultados que no verificaron.

## 8. Seguridad verificada

Probados: acceso cruzado A/B, lecturas de líneas/extras/historial ajenos, transiciones ajenas, propietario/staff/usuario sin membresía/sin identidad, configuración reservada al owner, tester sin autorización, falta de opciones obligatorias, extras duplicados/desconocidos, producto ajeno/agotado, zona ajena, precios alterados, doble confirmación, rollback, cancelación con motivo, estado final, actor del historial y separación comercial/test.

Tras las pruebas: cero pedidos permanentes, una membresía original, cero autorizaciones test creadas y ambos restaurantes con modo comercial y modo test desactivados. RLS sigue habilitado.

Supabase Security Advisor no reporta hallazgos nuevos. Permanece la advertencia previa **Leaked Password Protection Disabled**. [Explicación y remediación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Esta función no está incluida en Free; no se activó un plan de pago.

## 9. Commits y Pull Request

La rama y el PR se publican después de las verificaciones locales. Los enlaces y el resultado de CI se actualizan al cerrar la entrega. [Historial de la rama](https://github.com/1621-nicolas/brasa-norte-angular/commits/feat/v0.8-test-orders).

## 10. Estado de main

La base auditada era `3108937`. No se fusiona hasta verificar CI y ausencia de conflictos. Esta sección se actualizará con el resultado comprobado del PR.

## 11. Problemas encontrados y resolución

- README original describía V0.2 sin backend: reemplazado por instrucciones V0.8 y rutas claras; prototipos históricos conservados.
- `npm ci` sin el flag histórico falló con un error interno de npm; `npm ci --legacy-peer-deps` instaló correctamente. Se conserva el comando en CI y documentación.
- Los timestamps locales/remotos de migraciones no coincidían desde V0.3. Se documentó la correspondencia; no se forzó un `db push` ni se reescribió historial remoto.
- El esquema solo admitía pagos efectivo/yape: se ampliaron restricciones sin borrar datos y se agregó la combinación exclusiva simulacion/no_aplica para tests.
- La instalación del navegador de Playwright devolvió un archivo truncado en este entorno. La prueba local utilizó Chromium 153 empaquetado temporalmente; no se incorporó esa dependencia al producto.
- Pruebas iniciales detectaron sincronización incompleta del fixture Angular y un cierre de bloque de plantilla: corregidos y nueva batería completa aprobada.
- El asesor marcó la tabla privada sin política: se añadió denegación explícita, conservando RLS y ausencia de permisos directos.

- Revisión final: un UUID con mayúsculas podía eludir la detección de una combinación repetida. Se reprodujo mediante una prueba que fallaba, se normalizó el UUID y se verificó nuevamente en PGlite y Supabase. También se rechazan acciones nulas explícitamente.

## 12. Pendiente o no verificado

- Login de propietario y flujo HTTP autenticado completo contra la instancia remota: no ejecutado; no se solicitaron ni usaron credenciales personales. El usuario puede probarlo siguiendo el README.
- Ensayo de carga y concurrencia con varias conexiones PostgreSQL: pendiente. Sí se verificó idempotencia secuencial y restricciones.
- Pantalla para invitar/autorizar varios empleados: siguiente versión. V0.8 autoriza la propia cuenta propietaria visualmente y ofrece RPC segura para otros miembros existentes.
- Auditoría completa con lector de pantalla y otros navegadores: pendiente; se comprobaron etiquetas, foco visible, estados y flujo en Chromium.
- Publicación de un dominio frontend: fuera del alcance; se ejecuta con Angular en localhost. Otro dominio requiere configurar el origen permitido.
- Retención y archivado de simulaciones, restauración de backups y operación comercial: no implementados en esta fase.

## 13. Costos

La organización conectada utiliza **Supabase Free**. No se contrataron servicios ni ramas de desarrollo de pago. Se priorizaron pruebas locales y polling sobre Realtime.

Estimación para una demostración pequeña dentro de las cuotas actuales: **US$0/mes de infraestructura Supabase**. Free incluye 500 MB de base, 1 GB de almacenamiento, 5 GB de egreso y 500,000 invocaciones Edge; puede pausarse tras una semana de inactividad y no incluye backups automáticos. Una operación productiva futura puede requerir Pro, desde **US$25/mes** más excesos/opciones adicionales. No se promete costo cero fuera de las cuotas.

Fuentes oficiales consultadas el 19–20/10/2026: [Pricing](https://supabase.com/pricing), [Billing](https://supabase.com/docs/guides/platform/billing-on-supabase). No se calculó un equivalente en soles con un tipo de cambio no verificado.

## 14. Probar desde tu computadora

Consulta los comandos completos de actualización y clonación en [README](../README.md). Para una copia Git sin cambios pendientes:

```powershell
git fetch origin
git switch feat/v0.8-test-orders
git pull --ff-only origin feat/v0.8-test-orders
npm ci --legacy-peer-deps
npm start
```

En `/gestion`, inicia sesión como owner, abre Pedidos de prueba y habilita tu cuenta. Luego ve a `/catalogo/brasa-norte`, añade un plato con sus extras, revisa el pedido, usa los datos ficticios y confirma. Regresa a Gestión para atenderlo. No ejecutes migraciones nuevamente: ya están aplicadas.

## 15. Siguiente versión

Priorizar gestión de empleados e invitaciones, reconciliación del historial de migraciones, entorno de staging separado, pruebas HTTP autenticadas automatizadas y concurrencia, política de retención y backups. Solo después, diseñar pedidos públicos comerciales con controles de abuso, datos personales, horarios y confirmación de precios. Pagos y facturación requieren una fase y autorización específicas.
