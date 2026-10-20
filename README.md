# Brasa Norte · V0.8 — pedidos de prueba

SaaS multi-restaurante en Angular 21 + Supabase. El catálogo, las fotografías y los complementos existentes se conservan. La V0.8 añade checkout de simulación, validación transaccional en PostgreSQL y atención de pedidos desde el panel privado.

**Solo demostración autorizada: sin ventas, cobros, transferencias ni repartos reales.** Usa los clientes y direcciones ficticios del formulario. Los importes del carrito son provisionales; el servidor recalcula todo.

## Ejecutar en Windows / PowerShell

Recomendado: Node.js **24 LTS**, Git y npm. Abre PowerShell dentro de tu repositorio (preferiblemente fuera de OneDrive).

```powershell
# Detén antes npm start con Ctrl+C en la terminal donde se ejecuta.
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
npm ci --legacy-peer-deps
npm start
```

Si `git status --short` muestra cambios locales, guárdalos en un commit antes de cambiar de rama. No uses `git reset --hard` ni borres tus archivos. La V0.8 ya está fusionada en `main` mediante el [PR #10](https://github.com/1621-nicolas/brasa-norte-angular/pull/10), con todas las comprobaciones de CI aprobadas.

Si todavía no tienes una copia Git:

```powershell
New-Item -ItemType Directory -Force C:\Proyectos | Out-Null
Set-Location C:\Proyectos
git clone https://github.com/1621-nicolas/brasa-norte-angular.git
Set-Location brasa-norte-angular
git switch main
npm ci --legacy-peer-deps
npm start
```

Si aparece `EPERM` sobre `esbuild.exe`: detén el servidor con Ctrl+C, cierra las terminales que lo ejecutan y reintenta `npm ci --legacy-peer-deps`. Evita sincronizar `node_modules` con OneDrive. No hace falta modificar la política global de PowerShell ni ejecutar como administrador.

## Probar el flujo

1. Abre [Gestión](http://localhost:4200/gestion) e inicia sesión con tu cuenta propietaria existente.
2. Entra en **Pedidos de prueba** y pulsa **Habilitar pruebas con mi cuenta**. Este control habilita simulaciones para tu cuenta; nunca activa pedidos comerciales.
3. Abre [Carta conectada](http://localhost:4200/catalogo/brasa-norte). Elige complementos, añade productos y pulsa **Revisar pedido de prueba**.
4. Selecciona **Recojo** o **Delivery**, revisa los datos ficticios y el importe. Confirma que es una simulación y envía.
5. Vuelve a Gestión → Pedidos de prueba. Abre el pedido, acepta, prepara, marca listo y finaliza. Para delivery, primero simula la salida a reparto.
6. Revisa el historial y las estadísticas. Puedes pausar las simulaciones desde el mismo panel.

El modo de pruebas se despliega **pausado por defecto**. Un empleado que ya pertenece al restaurante puede atender pruebas habilitadas. Para crear pruebas necesita además una autorización explícita del propietario mediante la operación `authorize` documentada en [la fase V0.8](docs/FASE_08_PEDIDOS_PRUEBA.md).

## Rutas

| Ruta | Uso |
| --- | --- |
| `/catalogo/brasa-norte` | Catálogo conectado, carrito y checkout V0.8 |
| `/gestion` | Panel privado con catálogo, configuración y pedidos |
| `/gestion?tab=orders` | Acceso directo a pedidos de prueba |
| `/ingresar` | Supabase Auth, cuentas previamente asignadas |
| `/r/brasa-norte` | Prototipo anterior, local e independiente |
| `/demo/admin` | Panel del prototipo local anterior |
| `/admin` | Redirección al panel privado `/gestion` |

La portada sigue mostrando el prototipo anterior para conservar los enlaces existentes. Para probar V0.8 usa **`/catalogo/brasa-norte`**. `vista-previa/` conserva el prototipo HTML histórico.

## Verificaciones

```powershell
npm run build
npm test
npm run test:db
npm run test:edge
npx playwright install chromium
npm run test:e2e
```

- `test:db`: PostgreSQL desechable mediante PGlite; aplica las migraciones reales y prueba RLS, restricciones, roles, aislamiento, precios, idempotencia y estados. No necesita Docker ni credenciales.
- `test:edge`: pruebas de la frontera HTTP compartida con la función desplegada.
- `test:e2e`: navegador de escritorio y móvil con API interceptada y datos ficticios; **no genera pedidos en Supabase**.
- GitHub Actions ejecuta todas estas comprobaciones sin claves privadas.

## Backend y despliegue

La función `test-orders` autentica cada llamada contra Supabase Auth. Envía el JWT del usuario a la RPC; no utiliza `service_role`. La RPC verifica pertenencia, autorización de pruebas y todos los datos dentro de una transacción. Las tablas de pedidos no admiten escrituras directas de `anon` ni `authenticated`.

Las tres migraciones V0.8 y la Edge Function se aplicaron al proyecto `BRASANORTE`. No es necesario ejecutar SQL para probar esta versión desde tu computadora. Consulta [FASE_08_PEDIDOS_PRUEBA.md](docs/FASE_08_PEDIDOS_PRUEBA.md) antes de desplegar en otro entorno: el historial remoto utiliza fechas distintas de las migraciones locales anteriores.

## Documentación

- [Informe de entrega V0.8](docs/INFORME_V08.md): alcance, archivos, pruebas, seguridad, bloqueos y costos.
- [Arquitectura y operación V0.8](docs/FASE_08_PEDIDOS_PRUEBA.md): contrato API, permisos y migraciones.
- `docs/FASE_03_SUPABASE.md` a `FASE_07_CARRITO_CATALOGO.md`: contexto histórico.
