# 🚀 Guía de Despliegue - Lanas el Siglo

## 1️⃣ Crear Repositorio en GitHub

### Opción A: Desde GitHub UI (Recomendado)
1. Ve a https://github.com/new
2. Nombre: `lanas-el-siglo`
3. Descripción: "Ecommerce de lanas y fibras para tejido"
4. Privado o Público según prefieras
5. **NO inicialices** con README, .gitignore ni license (ya tenemos en local)
6. Clic en "Create repository"

### Opción B: Desde terminal (CLI)
```bash
gh repo create lanas-el-siglo --source=. --remote=origin --push --private
```

## 2️⃣ Conectar Local con GitHub

Si creaste el repo en web, conecta tu local:

```bash
git remote add origin https://github.com/TU_USUARIO/lanas-el-siglo.git
git branch -M main
git push -u origin main
```

Verifica que está conectado:
```bash
git remote -v
```

## 3️⃣ Configurar Cloudflare Pages + Workers

### Paso 1: Crear D1 Database
```bash
npx wrangler d1 create lanas-el-siglo-db
```
Copia el `database_id` y actualiza `wrangler.toml` en la sección `[[d1_databases]]`

### Paso 2: Crear R2 Bucket (para imágenes)
```bash
npx wrangler r2 bucket create lanas-el-siglo-products
```

### Paso 3: Actualizar wrangler.toml
Edita con tus valores de Cloudflare:
```toml
account_id = "tu_account_id"  # De dashboard.cloudflare.com
# database_id se completa después del paso 1
```

## 4️⃣ Conectar GitHub con Cloudflare Pages

1. Ve a **Cloudflare Dashboard** → **Pages**
2. Clic en **"Connect to Git"**
3. Autoriza GitHub y selecciona `lanas-el-siglo`
4. Configuración del build:
   - **Framework preset**: None (custom)
   - **Build command**: `npm run build:sites`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. Agrega variables de entorno:
   - `NODE_VERSION`: `22.13.0`
   - `NODE_ENV`: `production`
6. Clic en **"Save and Deploy"**

## 5️⃣ Conectar Cloudflare D1 + R2 con Pages

En Cloudflare Dashboard → Pages → Tu sitio → Settings → Functions → Bindings:

**D1 Database Binding:**
- Variable name: `DB`
- Database: `lanas-el-siglo-db`

**R2 Bucket Binding:**
- Variable name: `PRODUCTS_BUCKET`
- Bucket: `lanas-el-siglo-products`

## 6️⃣ Deploy automático

Ahora cada push a `main` desplegará automáticamente:
```bash
git add .
git commit -m "feat: setup Cloudflare deployment"
git push origin main
```

## 📊 Estructura después del deploy:

```
├── Frontend (Cloudflare Pages)
│   ├── Next.js SSG/SSR
│   └── React Components
├── API Backend (Cloudflare Workers)
│   ├── `/api/products`
│   ├── `/api/orders`
│   ├── `/api/checkout`
│   └── `/api/inventory`
├── Database (D1 SQLite)
│   ├── Products
│   ├── Orders
│   ├── Users
│   └── Inventory
└── Storage (R2)
    └── Product Images
```

## 🔧 Próximos pasos:

1. **Migrar datos a D1**: Scripts en `scripts/` para cargar catálogo
2. **Implementar checkout**: Integraciones de pago (Stripe, Wompi, etc)
3. **Autenticación**: Sign in with GitHub o Auth0
4. **Analytics**: Cloudflare Analytics Engine
5. **Email**: Transactional emails (Resend, SendGrid)

## 📚 Recursos útiles:

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
