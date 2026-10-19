# Brasa Norte V0.4: Angular + Supabase Auth

Esta rama **no habilita pedidos ni cobros reales**. La demo V0.2 en `/r/brasa-norte` y `/admin` sigue exactamente en localStorage. El panel `/admin` permanece público y SOLO debe usarse con datos ficticios.

## 1. Preparar el proyecto

Descarga/actualiza código y dependencias:

```powershell
git pull origin main
npm ci --legacy-peer-deps
npm start
```

> Esta guía funcionará después de integrar el PR de V0.4 y actualizar el lockfile. Antes de la integración, haz `git fetch origin` y `git switch feat/v0.4-auth-and-catalog`.

## 2. Configurar únicamente la clave PUBLICABLE

En Supabase > Project Settings > API Keys, copia **Publishable key** (`sb_publishable_...`).
En `src/app/core/supabase-client.ts`, reemplaza SOLO
`REEMPLAZAR_CON_TU_CLAVE_PUBLICABLE` por la clave publicable.
No copies `secret key`, `service_role` ni contraseñas a Angular.
La URL ya corresponde al proyecto de desarrollo BRASANORTE.
Esta clave se entregará al navegador de los visitantes; por eso las políticas RLS deben permanecer activas.

Para otras instalaciones, considera inyectar la configuración en tiempo de compilación y mantenerla fuera del historial de repositorios compartidos. No compartas claves secretas con nadie.

## 3. Crear tu usuario administrador

1. Abre el panel Supabase [Authentication / Users](https://supabase.com/dashboard/project/anrkxjythmkzttcypjmy/auth/users).
2. Crea o invita **tu propia cuenta de prueba** y configura una contraseña larga; no la compartas en GitHub ni en el chat.
3. Copia el UUID de la cuenta desde Authentication.
4. Ejecuta en SQL Editor, sustituyendo **solo** el UUID:

```sql
insert into public.restaurant_members (restaurant_id, user_id, role)
select id, '<UUID_DE_AUTH_USER>'::uuid, 'owner'
from public.restaurants where slug = 'brasa-norte'
on conflict (restaurant_id, user_id) do nothing;
```

Evita activar registro público de usuarios administradores. Los miembros solo se asignan con autorización confiable.

## 4. Publicar la CARTA FICTICIA para pruebas, sin pedidos

Los dos restaurantes se crearon inicialmente sin publicar. Para ver el catálogo público de Brasa Norte:
```sql
update public.restaurants
set published = true, accepting_orders = false
where slug = 'brasa-norte';
```

**Esto únicamente permite lectura pública del menú de prueba**, no crea pedidos ni acepta pagos. Mantén Burger Demo sin publicar.

## 5. Navegación

- `http://localhost:4200/r/brasa-norte`: demo vieja con carrito y pedidos ficticios guardados en tu navegador.
- `http://localhost:4200/admin`: panel DEMO, público y SIN LOGIN (nunca para clientes reales).
- `http://localhost:4200/catalogo/brasa-norte`: catálogo básico leído de PostgreSQL, **solo lectura**.
- `http://localhost:4200/ingresar`: login real con Supabase Auth.
- `http://localhost:4200/gestion`: área protegida de productos; edita precio/disponibilidad.
- `http://localhost:4200/catalogo/burger-demo`: debe indicar no publicado.

## 6. Pruebas

1. Sin sesión, navegar a /gestion redirige a /ingresar.
2. Inicia sesión con un usuario autorizado: muestra Brasa Norte.
3. Modifica un precio y recarga la página: el precio se obtiene de PostgreSQL.
4. Confirma que el nuevo precio también aparece en /catalogo/brasa-norte.
5. Cierra sesión y vuelve a intentar /gestion.
6. Con otro usuario SIN asignación, no debe poder consultar/modificar productos privados.
7. Un usuario staff debe poder leer pero no editar precios ni disponibilidad.
8. Ningún navegador debe poder escribir pedidos, crear roles ni consultar pedidos ajenos.
9. Comprueba: `npm run build`, `npm test`, [Security Advisors](https://supabase.com/dashboard/project/anrkxjythmkzttcypjmy/advisors/security).

## Pendientes importantes

- Aislamiento multi-restaurante con DOS sesiones reales probadas en navegadores separados.
- CRUD completo de categorías y productos, fotos y combos; operación segura de pedidos.
- Cambio de estado con autorización y auditoría.
- Eliminar/deshabilitar el panel demo público antes de cualquier despliegue comercial.
- Protección antiabusos y límites de uso de API; comprobaciones operativas.
- Auditoría del campo `published` y políticas con información de personal.
- Migrar diseño premium del demo a rutas conectadas cuando las pruebas pasen.

**El backend Supabase es el que impone la seguridad. Un guard Angular evita navegación accidental pero NO constituye autorización.**
