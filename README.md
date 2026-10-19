# Brasa Norte · Angular V0.2 (DEMO)

Migración estructural del prototipo HTML original a **Angular 21 standalone**, conservando sus colores, tipografía, estilos, tarjetas, navegación y flujo principal de compra.

> **IMPORTANTE: DEMOSTRACIÓN, NO USAR EN PRODUCCIÓN.** No existe backend, cuentas de usuario reales ni pagos. La página administrativa es pública para probar las funciones. Usa únicamente nombres, direcciones y teléfonos **ficticios**. La información reside en `localStorage` del mismo navegador, no se sincroniza entre equipos.

## Requisitos

- Node.js 22.12 o superior de la rama 22 (Angular 21 admite esta versión)
- npm con conexión a internet la primera vez para descargar las dependencias
- Windows con PowerShell o cualquier sistema con terminal

## Ejecutar en Windows

Abre PowerShell en la carpeta **brasa-norte-angular**:

```powershell
node -v
npm -v
npm install
npm start
```

Abre `http://localhost:4200` si no se abre automáticamente.

**No abras `src/index.html` directamente**: Angular requiere ejecutar el servidor de desarrollo o compilar la aplicación.

## Rutas

- `http://localhost:4200/r/brasa-norte` — tienda y catálogo
- `http://localhost:4200/admin` — panel restaurante de demostración, sin login

## Pruebas manuales

1. Abre **Menú**, busca productos y filtra por categoría.
2. Agrega un pollo y cambia el acompañamiento; agrega también extras y modifica la cantidad.
3. Abre el carrito, cambia cantidades y prueba eliminar una línea.
4. Completa una compra de prueba con datos ficticios: nombre `Cliente Prueba`, teléfono `900000000`, dirección ficticia y zona.
5. Entra a `/admin`: la orden aparecerá como `Pendiente`. Acepta, prepara y márcala como lista/entregada.
6. Edita un precio o la disponibilidad y comprueba que se refleja en la tienda.
7. Pausa la recepción de pedidos desde **Configuración** y comprueba que ya no se pueden crear órdenes nuevas.
8. Usa `Restablecer todos los datos de prueba` para reiniciar.

## Estructura

```text
src/app/
├── app.component.ts              # Cabecera y navegación
├── app.routes.ts                 # /r/brasa-norte y /admin
├── core/
│   ├── models.ts                 # Producto, carrito, pedidos y combos
│   └── demo-store.service.ts     # Estado, reglas de negocio y localStorage
├── public/
│   ├── storefront.component.ts   # Lógica cliente, carrito y checkout
│   └── storefront.component.html # Pantallas tienda y modales
└── admin/
    ├── admin.component.ts        # Lógica administrativa
    └── admin.component.html      # Pedidos, productos y configuración
```

El estilo original sigue en `src/styles.css`. Todos los precios y productos son de ejemplo.

## Vista previa sin instalar nada

`vista-previa/index.html` contiene la **versión HTML original V0.1**. Se puede abrir con doble clic, incluso sin npm. Es una vista previa anterior y no ejecuta Angular; se incluye para comparar ambos estilos.

## Compilar

```powershell
npm run build
```

La salida quedará dentro de `dist/brasa-norte/`.

## Limitaciones y próxima fase

- Sin autenticación ni autorización; `/admin` es público e inseguro para pedidos reales.
- Sin base de datos; `localStorage` es temporal y está aislado por navegador.
- La validación del checkout ocurre solo en el frontend: un atacante podría manipular importes. **No usar para vender**.
- Los horarios aún son informativos, no bloquean pedidos por calendario.
- Sin notificaciones de cocina, integración de pagos, control automático de delivery ni facturación.
- No hay aislamiento multi-tenant entre restaurantes; todavía es una instancia de Brasa Norte.
- Falta diseño avanzado de opciones y combos desde el panel.
- Falta control de foco/teclado completo para los diálogos y pruebas automatizadas de accesibilidad.

**Fase V0.3:** Supabase Postgres, autenticación segura, roles y RLS, creación de pedidos mediante función de servidor con recalculo de totales, idempotencia y comprobaciones entre restaurantes. Antes de vender: despliegue apto para producción, respaldos, observabilidad y pruebas de carga.

## Estado de verificación

Los archivos fuente y el proyecto Angular se prepararon y se validaron estructuralmente. El entorno de creación **no tenía acceso a registry.npmjs.org**; por tanto, no se pudo ejecutar `npm install` ni confirmar un `ng build` real aquí. Ejecuta `npm install` y `npm run build` en tu ordenador y comparte cualquier error para ajustarlo.

## Pruebas unitarias previstas

Cuando hayas instalado dependencias, ejecuta:

```powershell
npm test
```

Incluye pruebas Vitest para cálculos de subtotal y delivery, selección de extras, productos agotados, pedidos pausados y transiciones de estados. **Estas pruebas se incluyen como código pero no pudieron ejecutarse aquí por falta de acceso al registro npm.**

## Fase V0.3 en preparación: Supabase multi-restaurante

La rama `feat/v0.3-supabase-foundation` añade un esquema de datos para varios locales, políticas de acceso RLS, datos ficticios y una revisión de permisos SQL. **La aplicación Angular todavía sigue en modo demostración y NO está conectada a Supabase**. No acepta pedidos reales.

Lee [docs/FASE_03_SUPABASE.md](docs/FASE_03_SUPABASE.md) para configurar un proyecto de desarrollo, aplicar la migración y revisar la separación entre restaurantes antes de integrar Angular y Supabase Auth.

Se conserva intacto el diseño, el carrito y las rutas de la versión V0.2.

## Fase V0.4 — acceso Supabase (en desarrollo)
El nuevo catálogo de prueba se abre en `/catalogo/brasa-norte` (requiere que el local esté publicado)
y la gestión en `/ingresar` → `/gestion` (solo usuarios asignados mediante `restaurant_members`).
La tienda antigua `/r/brasa-norte` y el panel `/admin` siguen siendo una **demo local sin protección**.
No conectar pedidos reales allí. Ver `docs/FASE_04_ANGULAR.md`.
