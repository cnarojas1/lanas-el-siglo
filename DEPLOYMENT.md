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
| R2 bucket (medios) | `lanas-el-siglo-media` |
| Región D1 | ENAM |
| Repositorio | https://github.com/cnarojas1/lanas-el-siglo |

Los medios del panel se guardan en **R2** (antes Workers KV). R2 no tiene límite
diario de operaciones, así que el aviso de "50% del límite diario de Workers KV"
desaparece. Las imágenes se sirven desde `GET /api/media/[key]` con caché de
borde de 31 días (inmutable), por lo que R2 solo se consulta la primera vez que
se pide cada imagen.

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

Tablas: `products`, `product_variants`, `media`, `site_content`, `orders`,
`order_items`, `inventory`, `users`, `carts`, `cart_items`. Actualmente hay 36
productos en 6 categorías.

Las migraciones de `db/migrations/` se aplican en orden sobre el esquema base:

```bash
npx wrangler d1 execute lanas-el-siglo-db --file=db/migrations/004_variantes.sql --remote
```

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

`GET /api/admin/variants?product_id=N` — colores de un producto (lectura
pública). `POST` crea variantes desde `codes` o reparte `images`; `PUT`
actualiza código, nombre e imagen; `DELETE ?id=N` elimina. Las tres escrituras
exigen `ADMIN_TOKEN`.

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
| Medios | R2 (binario) + D1 (`media`) |
| Fotos por color de un producto | D1 (`product_variants`) |
| Cotizaciones | D1 (`orders`, `order_items`) — solo lectura |
| Categorías, Marcas, Contactos, Cotizaciones, Reportes, Administradores, Roles, Datos del sitio, SEO | Maqueta: solo la sesión actual |

Un producto con `visible = 0` desaparece de la tienda pero sigue en el panel.

### Medios

Sube varias imágenes a la vez (clic o arrastrando). Se aceptan JPG, PNG, WebP,
GIF, AVIF y SVG hasta 10 MB. "Copiar ruta" entrega una URL `/api/media/<clave>`
para pegar en el campo *Imagen* de la ficha de producto.

El binario vive en R2 (bucket `lanas-el-siglo-media`) y los metadatos en D1.
R2 no tiene límite diario de operaciones y las lecturas públicas se sirven desde
caché de borde (31 días, inmutable), así que el costo de servir el catálogo es
mínimo y no vuelve a aparecer el aviso de límite de Workers KV.

Las claves llevan un prefijo aleatorio, así que dos archivos con el mismo nombre
no se pisan y las imágenes se sirven con caché inmutable de un año.

### Fotos por color

Un producto puede tener varias fotos: una por código de color. Viven en
`product_variants` (migración `db/migrations/004_variantes.sql`), no en un campo
de texto, porque cada código necesita colgar su propia imagen.

En la ficha de producto, bajo el formulario, está **Más fotos de este producto**:

- **Agregar fotos** abre la biblioteca en selección múltiple y crea un color por
  imagen marcada.
- **Generar desde códigos** crea una variante por cada valor de *Colores /
  códigos*, para asignarles la foto después. Es idempotente: repetirlo no
  duplica ni pisa las fotos ya puestas.

Los códigos nuevos salen de los que el producto ya declara (`000`, `001`…). Las
fotos se reparten primero entre los códigos que aún no tienen imagen; solo las
sobrantes crean códigos nuevos. Las variantes se guardan al momento, sin pasar
por "Guardar cambios".

En la tienda salen como círculos bajo la ficha: al pulsarlos cambia la foto y el
código mostrado, y el color viaja en el mensaje de WhatsApp. **Solo se envían a
la tienda las variantes con foto**; un código sin imagen no aporta nada al
selector y llenaría la ficha de círculos vacíos.

Las fotos subidas se encuadran con `cover`/`center`. Las imágenes del bundle son
recortes de una lámina con zoom propio (`imageSize: "500% 500%"`), y aplicar ese
zoom a una foto normal la deforma.

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

## Migración KV → R2 (medios)

Cambio hecho el 2026-08-01 para salir del límite diario de Workers KV (aviso de
50% de operaciones). Procedimiento completo:

1. **Activar R2** en el dashboard: `R2 Storage` → *Accept terms of service*
   (una sola vez, sin costo, sigue en el plan free).
2. **Crear el bucket** `lanas-el-siglo-media`.
3. **Generar credenciales R2**: `R2` → *Manage R2 API Tokens* → *Create Access
   Token* (permisos: Object Read & Write sobre el bucket). Guardar
   `ACCESS_KEY_ID` y `SECRET_ACCESS_KEY`.
4. **Migrar las imágenes existentes** (las subidas antes del cambio siguen en
   KV; las nuevas ya van a R2):

   ```bash
   R2_ACCESS_KEY_ID=<id> R2_SECRET_ACCESS_KEY=<secret> \
   node scripts/migrate-kv-to-r2.mjs
   ```

   El script copia las 800+ claves del namespace KV `MEDIA` al bucket R2 con la
   misma clave y Content-Type, así las URLs no cambian.
5. **Desplegar**: `npx vinext deploy`.
6. **Verificar**: abrir un par de imágenes del catálogo y confirmar que
   responden `200` con `Cache-Control: public, max-age=2678400, immutable`.
7. (Opcional, después de verificar) **vaciar el namespace KV** `MEDIA`
   (`aadcce57d7584ffc89159f937fc24818`) desde el dashboard o
   `wrangler kv key bulk-delete` para liberar el almacenamiento del plan free.

## Dominio propio

Para usar un dominio como `lanaselsiglo.cl`, agrega la ruta en el dashboard de
Cloudflare (Workers & Pages → `lanas-el-siglo` → Settings → Domains & Routes)
con el dominio ya administrado por Cloudflare DNS.
