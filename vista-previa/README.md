# Brasa Norte — demostración interactiva (fase 1)

Este proyecto es un prototipo de frontend para validar con pollerías, hamburgueserías y restaurantes con delivery si les interesa una plataforma de carta digital y pedidos.

## Ejecutarlo

Opción más simple: abre `index.html` con Chrome, Edge o Firefox. No requiere instalar dependencias.

Si prefieres iniciarlo como servidor local, abre PowerShell en esta carpeta y ejecuta:

```powershell
python -m http.server 8000
```

Después, abre `http://localhost:8000` en tu navegador.

## Funciones que puedes probar

1. Explora el menú y filtra por categoría o buscador.
2. Agrega productos y elige complementos con precios adicionales.
3. Ajusta cantidades y revisa el carrito.
4. Completa un checkout simulado con datos inventados, entrega o recojo y tarifa por zona.
5. Confirma una orden **de prueba**, sin pagos reales y sin enviar nada a restaurantes.
6. Abre **Panel restaurante** para ver y cambiar el estado del pedido ficticio.
7. En **Productos**, modifica precios, disponibilidad y agrega artículos sencillos.
8. En **Configuración**, cambia horarios, costos de entrega y pausa los pedidos.

## Limitaciones importantes

- **No es un producto comercial listo para producción.** No hay backend ni base de datos central.
- No hay autenticación. Cualquiera que abra esta demostración puede entrar al panel administrativo.
- Los cambios y pedidos quedan en `localStorage` del mismo navegador y pueden perderse al borrar datos del sitio.
- No hay integración con WhatsApp, Yape, Plin, SUNAT ni repartidores.
- Las órdenes no se sincronizan entre equipos. No se envían notificaciones ni se procesan pagos.
- Productos, precios, ilustraciones y nombre del restaurante son ficticios.
- No ingreses datos personales reales durante las pruebas.
- El editor de productos inicial aún no administra de forma avanzada los grupos de extras de cada combo.
- La vista administrativa es de un solo restaurante; el aislamiento multi-tenant se añadirá con el backend.

## Próxima fase: Angular y Supabase

1. Crear proyecto Angular standalone con rutas públicas y privadas.
2. Convertir componentes y CSS del prototipo en Angular (Home, Catálogo, Producto, Carrito, Checkout).
3. Crear esquema PostgreSQL por restaurante (tenant), autenticación y RLS.
4. Crear una función segura para validar precios y registrar pedidos con idempotencia.
5. Implementar panel con acceso por roles y sincronización de órdenes.
6. Añadir pruebas de seguridad entre restaurantes, móviles, accesibilidad y errores.
7. Configurar un alojamiento apto para producción antes de aceptar pedidos reales.

## Propósito

Presentar este demo a 5–10 negocios y validar si valoran el **catálogo editable**, el **pedido desde el celular** y el **panel de órdenes** antes de invertir en infraestructura.
