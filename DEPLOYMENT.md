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

`catalog-data.ts` sigue existiendo como respaldo: si D1 no responde o está
vacía, la home lo usa para no quedar sin catálogo.

## API

`GET /api/products` — lee de D1. Acepta `?category=`, `?search=`, `?limit=`, `?offset=`.

```bash
curl "https://lanas-el-siglo.cnarojas1.workers.dev/api/products?limit=3"
```

El acceso a bindings dentro de rutas se hace con `import { env } from "cloudflare:workers"`
(ver `app/api/products/route.ts` y `db/index.ts`). El helper `json` de `next/server`
**no existe** en vinext; usa `Response.json()`.

## Pendiente

Lo que todavía NO está hecho, en orden de importancia:

1. **El carrito es solo de navegador.** Vive en estado de React; no crea filas en
   `orders` ni `order_items`. El pedido se envía copiándolo a WhatsApp.
2. **No hay checkout ni pagos.**
3. **El inventario no se descuenta.** La tabla `inventory` tiene stock inicial,
   pero nada la consulta ni la actualiza al comprar.
4. **No hay autenticación** ni panel de administración con persistencia
   (`/admin` guarda textos en `localStorage` del navegador, no en D1).
5. **No hay CI/CD.** El deploy es manual con `npx vinext deploy`.
6. **R2 no está habilitado** en la cuenta. Las imágenes se sirven como assets
   estáticos del Worker, lo cual funciona bien para el volumen actual.

## Dominio propio

Para usar un dominio como `lanaselsiglo.cl`, agrega la ruta en el dashboard de
Cloudflare (Workers & Pages → `lanas-el-siglo` → Settings → Domains & Routes)
con el dominio ya administrado por Cloudflare DNS.
