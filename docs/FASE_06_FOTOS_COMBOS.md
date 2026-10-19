# Brasa Norte V0.6 · Fotografías, combos y complementos

Esta versión amplía el **catálogo de prueba** de Brasa Norte; no acepta pedidos ni pagos reales.

## Cambios de navegación

- `/gestion`: administración real con Supabase Auth y políticas RLS.
- `/admin`: **redirección a /gestion**. Ya no muestra el panel sin login.
- `/demo/admin`: antiguo panel de pedidos ficticios, claramente marcado como DEMO.
- `/catalogo/brasa-norte`: carta pública leída de PostgreSQL con fotos y selecciones de extras.
- `/r/brasa-norte`: demostración de carrito local, aún desconectada del menú real.

**No introduzcas clientes ni pedidos reales en ninguna ruta de demostración.**

## Antes de probar con Angular

La migración `supabase/migrations/20261019020000_catalog_media_options.sql`
debe aplicarse a Supabase. Crea un bucket público de imágenes de catálogo de
JPG, PNG y WebP (máximo 2 MB) y restringe las subidas con políticas de Storage
a los propietarios/administradores de cada restaurante.

La galería es **pública**: cualquier persona con la URL puede ver una foto,
incluso si el producto se despublica después. No subir imágenes personales,
documentos de identidad ni información confidencial.

Para la configuración, sigue utilizando **solo la clave publicable** en
`src/app/core/supabase-client.ts`. Nunca incluyas `service_role` en Angular.

## Uso del panel

1. Inicia sesión en `/ingresar`.
2. En `/gestion`, abre **Productos**, pulsa Editar sobre un producto existente.
3. Selecciona una foto JPG/PNG/WebP de menos de 2 MB y después **Guardar producto**.
   Para un producto nuevo: créalo primero, vuelve a Editar y sube la foto.
4. En **Combos y extras**, selecciona un plato y crea un grupo.
   Ejemplo: "Elige tu bebida", mínimo 1 y máximo 1.
5. Añade opciones: "Chicha morada" (+ S/0), "Gaseosa" (+ S/2).
6. Visita `/catalogo/brasa-norte` desde otro navegador para ver las opciones
   y un precio **de prueba** con recálculo local.

Los grupos y opciones se pueden **desactivar**, pero no eliminar, para evitar
borrados accidentales. Para prevenir errores al configurar combos obligatorios,
asegura que la cantidad de opciones activas sea suficiente para cumplir el mínimo.

## Límites de la entrega

- No hay checkout real, confirmación de precios desde el servidor, pagos, ni
  impresión/gestión de pedidos reales.
- La selección de extras en catálogo es **vista previa únicamente**.
- La foto nueva se sube a Storage antes de guardar el producto. Si cancelas,
  puede quedar un archivo sin referencia; queda pendiente una rutina de limpieza.
- Las fotos retiradas del catálogo no se eliminan físicamente de Storage.
- No hay compresión automática: optimiza fotos antes de subirlas para reducir costos.
- RLS controla pertenencia en `products` / `product_option_groups` /
  `product_options` y políticas de subida por carpeta en Storage.
- Se necesitan pruebas manuales de autorización con usuarios de dos restaurantes
  y de subida de foto, porque CI no dispone de las credenciales de esas cuentas.

## Pruebas sugeridas

- Una cuenta sin sesión no puede abrir `/gestion`.
- Un propietario puede crear combos y subir fotografías de **su** restaurante.
- Un usuario staff no puede cargar fotos ni modificar productos/extras.
- La URL pública de un producto solo muestra el catálogo publicado del restaurante.
- Una cuenta del restaurante B no puede escribir en el restaurante A.
- Verifica `npm run build`, `npm test` y avisos del asesor de seguridad Supabase.

Documentación:
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
