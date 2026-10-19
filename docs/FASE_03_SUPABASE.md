# Fase V0.3 · Supabase (fundación segura, sin activar producción)

## Estado real de la entrega

Esta rama añade **un esquema PostgreSQL reproducible**, permisos RLS de catálogo multi-restaurante, datos ficticios y una revisión automatizable de permisos.
**NO** conecta aún Angular, **NO** autentica usuarios desde la interfaz y **NO** permite crear pedidos reales.
La V0.2 sigue funcionando con `localStorage`, sin cambios de diseño ni de navegación.

### Objetivo técnico

- Un solo backend para varias pollerías, hamburgueserías y restaurantes.
- Datos comerciales aislados por `restaurant_id`.
- Catálogos públicos **solo** cuando `published = true`; sin acceso público a pedidos.
- Propietarios/encargados asignados mediante `auth.users` + `restaurant_members`.
- Permisos de edición a `owner` / `manager`; `staff` solo consulta los pedidos de su restaurante.
- Precios en céntimos (`price_cents`) y referencias compuestas para impedir relacionar productos de otro local.
- Una clave única de idempotencia por restaurante y pedido, preparada para el futuro backend.

## Paso 1 — Crear entorno de desarrollo

1. Crea un proyecto nuevo en [Supabase](https://supabase.com/dashboard) para **desarrollo**; no reutilices un proyecto con datos comerciales reales.
2. Conserva la contraseña de la base de datos fuera de GitHub.
3. Abre **SQL Editor** y ejecuta íntegramente `supabase/migrations/20261019010000_initial_multitenant.sql`.
4. Ejecuta `supabase/seed.sql` para los dos restaurantes ficticios.
5. Ejecuta `supabase/tests/security_audit.sql`: debe terminar con el aviso `Revisión de RLS y grants: OK`.

Si prefieres CLI, inicializa/enlaza el proyecto con los comandos de la versión instalada y aplica la migración mediante el flujo de Supabase CLI. No ejecutes dos veces el mismo archivo de creación de tablas.

> Antes de migrar un esquema con datos reales, prueba en un entorno separado y planifica respaldo/rollback. Este código no se ha ejecutado contra un servidor PostgreSQL en esta entrega.

## Paso 2 — Crear el propietario (cuando habilitemos Angular Auth)

1. En **Authentication → Users**, crea/invita tu usuario. No incluyas contraseñas en archivos.
2. Copia el UUID real de ese usuario.
3. Ejecuta en SQL Editor, sustituyendo el UUID:

```sql
insert into public.restaurant_members (restaurant_id, user_id, role)
select r.id, '<UUID_DE_AUTH_USERS>'::uuid, 'owner'
from public.restaurants r
where r.slug = 'brasa-norte';
```

**Nunca** otorgues a un usuario permiso para crear o cambiar su propio rol desde el frontend.
Los usuarios no pueden modificar `restaurant_members` mediante la API pública. El alta inicial se hace por administración confiable.

## Paso 3 — Verificar reglas con dos usuarios

- Invitado: mientras `published=false`, no debe ver los restaurantes ni productos.
- Publica SOLO el restaurante de prueba:
  `update public.restaurants set published=true where slug='brasa-norte';`
- Invitado: ve el catálogo publicado, pero **no** las tablas de pedidos ni la lista de miembros.
- Usuario propietario A: lee su restaurante aunque esté despublicado y puede editar sus productos.
- Usuario de restaurante B: no lee ni edita los pedidos, productos privados ni categorías borrador de A.
- Ningún usuario del navegador, aunque esté autenticado, tiene permiso de insertar pedidos, modificar estados ni asignarse roles.

**El archivo de auditoría comprueba presencia de RLS y permisos SQL**, no sustituye una prueba integrada real con JWT de dos usuarios distintos.

## Por qué no se crean pedidos todavía

El navegador puede alterar precios, extras, entrega y cantidades. La inserción de pedidos requerirá una **Edge Function** o API confiable que:

1. Reciba únicamente IDs de productos, opciones, cantidades y entrega; no confíe en totales del cliente.
2. Valide restaurante publicado y receptivo, disponibilidad, límites y combinaciones obligatorias.
3. Recalcule importes en el servidor a partir de la base de datos.
4. Persista el pedido, sus detalles y snapshots en una **transacción** y maneje `idempotency_key`.
5. Aplique medidas anti-abuso, límites por petición y registro de errores.
6. Autorice por restaurante los cambios de estado y preserve historial.

**NO habilitar en el navegador** permisos de escritura directa sobre `orders` o sus detalles.

## Próxima entrega del código Angular

Una vez exista el proyecto de Supabase y hayamos revisado las reglas con JWT reales:

- Instalar `@supabase/supabase-js` usando una versión fijada y registrar el lockfile.
- Configurar URL y **publishable key** (publicables), **nunca** `service_role` en Angular.
- Login/Logout del personal y guardias de rutas. Ninguna seguridad depende del guard: RLS manda.
- Leer catálogo multi-restaurante desde Postgres, empezando por `/r/brasa-norte`.
- Dejar el modo demostración activable explícitamente para no perder el diseño y las pruebas.
- Construir endpoint de pedidos seguros y pruebas de integración antes de abandonar la demo.

## Costos y límites

Puedes preparar esta fase con S/0 en infraestructura de desarrollo mientras estés dentro de las cuotas del proveedor.
Planes gratuitos no equivalen a garantía de disponibilidad ni backup para pedidos comerciales.
No prometas ventas reales, cobros ni sincronización entre dispositivos hasta completar la integración y las pruebas.

Documentación: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Auth](https://supabase.com/docs/guides/auth).
