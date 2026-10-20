# Fase V0.7 · Carrito de demostración conectado a Supabase

La página `/catalogo/brasa-norte` muestra la carta pública de Supabase
y permite armar un carrito con productos, complementos, cantidades y subtotal.
**NO envía pedidos, NO recoge nombres/teléfonos/direcciones y NO procesa pagos.**

## Funciones

- Menú, fotografías, grupos y extras leídos desde el PostgreSQL existente.
- Grupos obligatorios validados antes de agregar productos al carrito.
- Para cada línea se guarda producto, foto, precio unitario en céntimos y
  opciones seleccionadas tal como se mostraron al agregarlo.
- Combinaciones idénticas del mismo producto se agrupan hasta 20 unidades.
  Una selección diferente se muestra en otra línea.
- Modificar cantidades (entre 1 y 20), quitar líneas, vaciar carrito.
- Subtotal informativo sin costo de delivery.
- Diseño responsive: carrito lateral en PC y cajón desplegable en móvil.
- El carrito se conserva únicamente en memoria mientras usas la app.
  Se vacía al recargar el navegador o cambiar de restaurante.

## Importante

Los precios están calculados **en el navegador** y pueden quedar desactualizados
si el restaurante edita la carta mientras una persona está mirando la página.
No deben usarse para registrar ventas ni confirmar cobros. La futura fase de
pedidos incluirá recálculo autoritativo en el servidor, validación de horarios,
zonas, disponibilidad y combinaciones, idempotencia y medidas anti-abuso.

Para un carrito persistente habría que almacenar únicamente identificadores de
productos, opciones y cantidades y volver a validarlos con los datos actuales;
no confiar jamás en precios almacenados por el navegador.

## Verificación

1. `npm ci --legacy-peer-deps` (solo si faltan dependencias).
2. `npm run build` y `npm test`.
3. Abrir `http://localhost:4200/catalogo/brasa-norte`.
4. Intentar agregar pollo sin acompañamiento: no debe permitirlo.
5. Elegir Papas grandes (+S/3) y Queso extra (+S/2):
   con pollo a S/18.90, precio unitario de prueba = **S/23.90**.
6. Agregar dos unidades: subtotal S/47.80.
7. Añadir de nuevo esa misma combinación: se agrupa.
8. Cambiar la combinación: aparece como línea nueva.
9. Vaciar carrito y refrescar: no existen pedidos en Supabase.
10. Simular navegación a un segundo restaurante publicado para comprobar
    que el carrito anterior no se mezcle con su catálogo.

Los pedidos reales permanecerán desactivados en Supabase.
La antigua demo de compras está separada en `/r/brasa-norte`.
