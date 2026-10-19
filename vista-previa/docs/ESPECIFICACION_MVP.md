# Brasa Norte — Especificación del MVP (v0.1)

## Propósito comercial

Validar la demanda de una carta digital editable y, en la fase siguiente, un panel de pedidos para pollerías y hamburgueserías independientes del Perú. El primer prototipo es **solo demostrativo**.

## Usuarios

- **Visitante:** explora la carta y simula un pedido desde el móvil, sin registrarse.
- **Operador del restaurante:** consulta pedidos, cambia estados y actualiza la carta. En el prototipo este rol es simulado, sin acceso protegido.
- **Administrador de la plataforma:** en el producto futuro da de alta negocios y mantiene sus suscripciones (no incluido en demo).

## Flujos principales

### Cliente (demo)

1. Entra al menú del restaurante.
2. Filtra por categoría o utiliza el buscador.
3. Selecciona un producto y, si aplica, sus opciones y complementos.
4. Ajusta la cantidad y añade al carrito.
5. Elige delivery (tarifa fija por zona) o recojo.
6. Completa **datos de prueba** y ve el total.
7. Crea un pedido ficticio que solo existe en el navegador actual.

### Restaurante (demo)

1. Entra al panel sin autenticación, con aviso visible de demostración.
2. Observa los pedidos ficticios creados en ese navegador.
3. Cambia su estado de forma secuencial.
4. Edita el nombre, precio y disponibilidad de los productos.
5. Ajusta horarios informativos y tarifas por zona.

## Alcance del siguiente MVP comercial

**Imprescindible:**
- Frontend Angular responsive y accesible.
- Catálogo público, categorías, búsqueda, carrito, productos con variaciones y extras.
- Checkout con validación robusta de importes y reglas de entrega.
- Persistencia central de pedidos y trazabilidad de estados.
- Login y roles por restaurante.
- Aislamiento entre empresas mediante `restaurante_id`, autorización y políticas RLS.
- Opciones de pausa y agotamiento del menú.
- Protección ante duplicados, solicitudes abusivas y datos incorrectos.
- Gestión inicial de restaurantes desde un panel administrativo seguro.
- Logs, copias de seguridad y procedimiento de recuperación.

**Fuera del primer MVP:**
- Pasarela de pagos automáticos, facturación SUNAT, GPS, integración con apps de reparto, inventario por receta, programa de fidelización, aplicación móvil nativa y seguimiento en tiempo real de repartidores.

## Estados de pedido y transiciones

`pendiente → confirmado → preparando → listo → en_camino → entregado`

En recojo, desde `listo` puede pasarse directamente a `entregado`.

Los estados `pendiente` y `confirmado` pueden pasar a `cancelado`.

En el backend real, cada transición deberá comprobar el restaurante y el rol del usuario que ejecuta la acción.

## Modelo de datos inicial propuesto

- `restaurantes(id, slug, nombre, phone, estado)`
- `usuarios_restaurante(id, usuario_id, restaurante_id, rol)`
- `categorias(id, restaurante_id, nombre, orden)`
- `productos(id, restaurante_id, categoria_id, nombre, descripcion, precio, disponible)`
- `grupos_opciones(id, producto_id, minimo, maximo)`
- `opciones(id, grupo_id, nombre, precio_adicional)`
- `horarios(id, restaurante_id, dia, apertura, cierre)`
- `zonas_delivery(id, restaurante_id, nombre, tarifa, activo)`
- `pedidos(id, restaurante_id, cliente, contacto, modalidad, direccion, zona_id, costo_envio, total, estado, idempotency_key, creado_en)`
- `pedido_detalles(id, pedido_id, producto_id, nombre_snapshot, cantidad, precio_unitario_snapshot)`
- `pedido_opciones(id, detalle_id, nombre_snapshot, precio_snapshot)`
- `historial_pedidos(id, pedido_id, estado_anterior, estado_nuevo, actor_id, creado_en)`
- `suscripciones(id, restaurante_id, plan, periodo, estado)`

Los importes deberán almacenarse como `numeric(10,2)` o unidades enteras de céntimos, nunca como punto flotante sin control.

## Definición de terminado para salida a producción

- [ ] No hay datos de un restaurante visibles para otro.
- [ ] El cliente no puede forzar precios, extras o costos de delivery arbitrarios.
- [ ] La API admite reintentos sin duplicar pedidos.
- [ ] Pedidos rechazados y fallos de red producen mensajes correctos.
- [ ] Las pantallas funcionan en móvil, teclado y lector de pantalla en flujos principales.
- [ ] Hay monitorización, backups, restauración probada y responsables de soporte.
- [ ] Textos de privacidad, conservación de datos y consentimiento adecuados.
- [ ] La infraestructura contratada es apropiada para pedidos reales.

## Validación comercial

Enseñar la demo a 5–10 negocios, recoger: si reciben pedidos por WhatsApp, cuántas personas atienden, frecuencia de errores, si quieren menú editable, si utilizarían un panel y cuánto pagarían por instalación y mensualidad.

Regla orientativa: no priorizar nuevas funciones hasta confirmar que al menos algunos negocios quieren probar la solución y han identificado un problema concreto.
