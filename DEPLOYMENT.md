# Despliegue — Lanería El Siglo

## Estado actual

El sitio está desplegado y respondiendo en:

**https://lanas-el-siglo.cnarojas1.workers.dev**

Se despliega como **Cloudflare Worker con assets estáticos** (no Cloudflare Pages).
No existe ni existirá un `lanas-el-siglo.pages.dev` con esta configuración.

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
`cart_items`.

Para consultar el contenido actual:

```bash
npx wrangler d1 execute lanas-el-siglo-db --remote --command "SELECT COUNT(*) FROM products"
```

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

1. **La web no usa D1.** `app/page.tsx` renderiza los 36 productos de
   `app/catalog-data.ts` (archivo local). D1 tiene solo 9 productos cargados y
   ninguna página los consulta. Para conectarlos hay que migrar el catálogo
   completo a `db/seed.sql` y hacer que la home consuma `/api/products`.
2. **El carrito es solo de navegador.** Vive en estado de React; no crea filas en
   `orders` ni `order_items`.
3. **No hay checkout ni pagos.**
4. **No hay autenticación** ni panel de administración con persistencia
   (`/admin` guarda textos en `localStorage`).
5. **No hay CI/CD.** El deploy es manual con `npx vinext deploy`.
6. **R2 no está habilitado** en la cuenta. Las imágenes se sirven como assets
   estáticos del Worker, lo cual funciona bien para el volumen actual.

## Dominio propio

Para usar un dominio como `lanaselsiglo.cl`, agrega la ruta en el dashboard de
Cloudflare (Workers & Pages → `lanas-el-siglo` → Settings → Domains & Routes)
con el dominio ya administrado por Cloudflare DNS.
