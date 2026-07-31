# Despliegue — Lanería El Siglo

## Estado actual

El sitio está desplegado y respondiendo en:

**https://lanas-el-siglo.cnarojas1.workers.dev**

Se despliega como **Cloudflare Worker con assets estáticos** (no Cloudflare Pages).
No existe ni existirá un `lanas-el-siglo.pages.dev` con esta configuración.

El catálogo se sirve desde D1 en cada petición: editar la base de datos cambia
la tienda sin necesidad de redesplegar.

## Recursos en Cloudflare

| Recurso | Valor |
|---|---|
| Worker | `lanas-el-siglo` |
| Account ID | `f7f6884635183bbdf2c77577001262cb` |
| D1 database | `lanas-el-siglo-db` |
| D1 database ID | `2edb6cb8-e9e1-443a-aab9-be50396ae5db` |
| KV namespace (medios) | `aadcce57d7584ffc89159f937fc24818` |
| Región D1 | ENAM |
| Repositorio | https://github.com/cnarojas1/lanas-el-siglo |

## Desplegar

```bash
npx vinext deploy
```

Compila y publica en un solo paso. El deploy es **manual**: no hay CI/CD conectado,
así que un `git push` por sí solo no actualiza el sitio.

Para compilar sin publicar:

```bash
npx vinext build
```

## Bindings

`wrangler.toml` declara el binding D1 y las variables. vinext lo fusiona con su
propia configuración al construir y genera `dist/server/wrangler.json`.

Importante: **no declares `compatibility_flags = ["nodejs_compat"]`** en
`wrangler.toml`. vinext ya lo agrega y Cloudflare rechaza el deploy con
`Compatibility flag specified multiple times [code: 10021]`.

## Base de datos

Esquema y datos semilla:

```bash
npx wrangler d1 execute lanas-el-siglo-db --file=db/init.sql --remote
npx wrangler d1 execute lanas-el-siglo-db --file=db/seed.sql --remote
```

Tablas: `products`, `orders`, `order_items`, `inventory`, `users`, `carts`,
`cart_items`. Actualmente hay 36 productos en 6 categorías.

Para consultar el contenido actual:

```bash
npx wrangler d1 execute lanas-el-siglo-db --remote --command "SELECT COUNT(*) FROM products"
```

### Editar el catálogo

La home lee los productos desde D1 en cada petición, así que **un cambio en la
base de datos aparece en el sitio sin recompilar ni redesplegar**:

```bash
npx wrangler d1 execute lanas-el-siglo-db --remote \
  --command "UPDATE products SET price = 14000 WHERE id = 1"
```

`db/seed.sql` está **generado** a partir de `app/catalog-data.ts` por
`scripts/generate-seed.mjs`; no lo edites a mano. Para reconstruirlo tras tocar
el catálogo del bundle:

```bash
node scripts/generate-seed.mjs
npx wrangler d1 execute lanas-el-siglo-db --file=db/seed.sql --remote
```

⚠️ `seed.sql` empieza con `DELETE FROM products`, así que **recargarlo descarta
los cambios hechos desde /admin** (precios, visibilidad, descripciones e
imágenes asignadas). Úsalo para reconstruir el catálogo desde cero, no como
actualización incremental.

`catalog-data.ts` sigue existiendo como respaldo: si D1 no responde o está
vacía, la home lo usa para no quedar sin catálogo.

## API

`GET /api/products` — lee de D1. Acepta `?category=`, `?search=`, `?limit=`, `?offset=`.

`POST /api/orders` — deja registrada una cotización (público, sin datos de
contacto). `GET /api/orders` — listado para el panel, requiere `ADMIN_TOKEN`.

```bash
curl "https://lanas-el-siglo.cnarojas1.workers.dev/api/products?limit=3"
```

El acceso a bindings dentro de rutas se hace con `import { env } from "cloudflare:workers"`
(ver `app/api/products/route.ts` y `db/index.ts`). El helper `json` de `next/server`
**no existe** en vinext; usa `Response.json()`.

## Panel de administración

`/admin` es público, así que la autorización vive en la API: leer no requiere
nada, pero **toda escritura exige la contraseña del panel**. Sin el secreto
`ADMIN_TOKEN` configurado, las escrituras se rechazan (fail-closed) en vez de
quedar abiertas.

Cambiar la contraseña:

```bash
npx wrangler secret put ADMIN_TOKEN
npx vinext deploy
```

La sesión se guarda en `sessionStorage` del navegador: se pierde al cerrar la
pestaña y solo viaja como cabecera `Authorization`.

Es una contraseña compartida, no cuentas por persona. Las secciones
"Administradores" y "Roles y permisos" siguen siendo maquetas.

### Qué se guarda de verdad

| Sección | Persistencia |
|---|---|
| Banners, Páginas, Preguntas frecuentes | D1 (`site_content`) |
| Listado de productos (precio, nombre, categoría, descripción, visibilidad, imagen) | D1 (`products`) |
| Medios | KV (binario) + D1 (`media`) |
| Cotizaciones | D1 (`orders`, `order_items`) — solo lectura |
| Categorías, Marcas, Contactos, Cotizaciones, Reportes, Administradores, Roles, Datos del sitio, SEO | Maqueta: solo la sesión actual |

Un producto con `visible = 0` desaparece de la tienda pero sigue en el panel.

### Medios

Sube varias imágenes a la vez (clic o arrastrando). Se aceptan JPG, PNG, WebP,
GIF, AVIF y SVG hasta 10 MB. "Copiar ruta" entrega una URL `/api/media/<clave>`
para pegar en el campo *Imagen* de la ficha de producto.

El binario vive en KV y los metadatos en D1. Lo natural sería R2, pero **R2 no
está habilitado en la cuenta** (`code: 10042`): hay que activarlo desde el
dashboard, lo que implica aceptar sus términos. KV admite hasta 25 MB por valor,
suficiente para el catálogo actual.

Las claves llevan un prefijo aleatorio, así que dos archivos con el mismo nombre
no se pisan y las imágenes se sirven con caché inmutable de un año.

## Cotizaciones

La bolsa tiene una sola acción: **Enviar cotización por WhatsApp**. Abre
`wa.me` con el detalle del carrito y el total ya escritos, y la conversación
continúa por ahí. No hay checkout, ni datos de despacho, ni cobro en el sitio.

El número se configura en `wrangler.toml`:

```toml
WHATSAPP_NUMBER = "56995096522"   # solo dígitos, con código de país
```

Si se deja vacío, el botón copia la cotización al portapapeles en vez de abrir
WhatsApp, así que la tienda nunca queda sin salida.

### Registro

Al pulsar el botón se deja una copia en D1 (`orders` con estado `cotizacion`,
más sus líneas en `order_items`), visible en **Solicitudes → Cotizaciones** del
panel. Dos detalles deliberados:

**No pide datos de contacto.** El cliente se identifica en WhatsApp; exigirle un
formulario antes de escribir solo agrega fricción. Por eso la cotización queda
registrada sin nombre ni correo, y se cruza con la conversación por el detalle y
la hora.

**No descuenta inventario.** Una cotización no es una venta. Si se descontara,
los clics que nunca se concretan vaciarían el stock y el `CHECK` del inventario
terminaría bloqueando el botón con "agotado" sin haber vendido nada. El stock
solo debería bajar al confirmar una venta real.

El registro no bloquea el envío: si falla, WhatsApp se abre igual. El canal real
es la conversación, la base de datos es solo el historial.

## Pendiente

Lo que todavía NO está hecho, en orden de importancia:

1. **No hay venta en línea.** El cierre ocurre por WhatsApp: disponibilidad,
   despacho y pago se acuerdan en la conversación.
2. **El stock nunca baja solo.** Hay que ajustarlo a mano en `inventory` cuando
   se concrete una venta.
3. **El estado de la cotización no se puede cambiar** desde el panel; se ven
   pero no se gestionan.
4. **El panel usa una contraseña compartida**, no cuentas por persona con
   registro de quién cambió qué.
5. **No hay CI/CD.** El deploy es manual con `npx vinext deploy`.
6. **R2 no está habilitado** en la cuenta, así que los medios subidos viven en
   KV. Funciona para el volumen actual; si la biblioteca crece mucho, conviene
   habilitar R2 y migrarlos.

## Dominio propio

Para usar un dominio como `lanaselsiglo.cl`, agrega la ruta en el dashboard de
Cloudflare (Workers & Pages → `lanas-el-siglo` → Settings → Domains & Routes)
con el dominio ya administrado por Cloudflare DNS.
