# ✅ Cloudflare Setup Completado

Tu infraestructura está lista:

## 📊 Recursos Creados

| Recurso | Valor | Estado |
|---------|-------|--------|
| **Account ID** | `f7f6884635183bbdf2c77577001262cb` | ✅ |
| **D1 Database** | `lanas-el-siglo-db` | ✅ Creada |
| **Database ID** | `2edb6cb8-e9e1-443a-aab9-be50396ae5db` | ✅ |
| **R2 Bucket** | `lanas-el-siglo-products` | ⏳ Opcional |
| **GitHub Repo** | github.com/cnarojas1/lanas-el-siglo | ✅ Creado |

## 🔑 Paso 1: Crear API Token de Cloudflare

1. Ve a: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Usar template: **"Edit Cloudflare Workers"**
4. **Permisos necesarios:**
   - ✅ Account > Workers KV Storage > Edit
   - ✅ Account > D1 > Edit
   - ✅ Account > Pages > Edit
   - ✅ Account > Cloudflare Pages > Manage
5. **Recursos:** 
   - Account > Include > All accounts
6. Click **"Create Token"**
7. **Copia el token** (no lo compartirás con nadie)

## 🚀 Paso 2: Agregar Secrets a GitHub Actions

Abre GitHub en tu navegador:
- Ve a: https://github.com/cnarojas1/lanas-el-siglo/settings/secrets/actions
- Click **"New repository secret"**

**Agrega estos 2 secrets:**

### Secret 1: CLOUDFLARE_API_TOKEN
- **Name:** `CLOUDFLARE_API_TOKEN`
- **Value:** (Pega el token que copiaste en Paso 1)
- Click **"Add secret"**

### Secret 2: CLOUDFLARE_ACCOUNT_ID
- **Name:** `CLOUDFLARE_ACCOUNT_ID`
- **Value:** `f7f6884635183bbdf2c77577001262cb`
- Click **"Add secret"**

## 🌐 Paso 3: Conectar Cloudflare Pages

1. Ve a: https://dash.cloudflare.com/pages
2. Click **"Connect to Git"**
3. Autoriza GitHub (si no lo has hecho)
4. Selecciona: `cnarojas1/lanas-el-siglo`
5. Click **"Begin setup"**

**Configuración del build:**
```
Framework preset: None
Build command: npm run build:sites
Build output directory: dist
Root directory: /
```

6. **Variables de entorno:**
   - `NODE_VERSION` = `22.13.0`
   - `NODE_ENV` = `production`

7. Click **"Save and Deploy"**

## 📝 Paso 4: Verificar Deploy

```bash
# Ver status en terminal
cd /Users/nicolasrojas/Documents/Lanas\ el\ Siglo
git log --oneline -3
git remote -v
```

Tu sitio estará disponible en:
```
https://lanas-el-siglo.pages.dev
```

## 🔧 Paso 5 (Opcional): Conectar dominio personalizado

Si tienes dominio (ej: lanaselsiglo.cl):

1. En Cloudflare Dashboard → Pages → lanas-el-siglo → Settings
2. **Custom domains** → Add custom domain
3. Sigue las instrucciones DNS

## ✨ Resumen

- ✅ Repositorio en GitHub
- ✅ D1 Database lista con tablas y datos
- ✅ API de ejemplo creada
- ✅ wrangler.toml configurado
- ✅ Listo para conectar Cloudflare Pages
- ⏳ Pendiente: API Token + Secrets GitHub

**Próximo paso:** Crear API Token (5 min) y agregar secrets a GitHub (2 min)

---

📚 **Archivos relacionados:**
- `wrangler.toml` - Configuración actualizada
- `.env.example` - Variables de entorno
- `db/init.sql` - Schema de base de datos
- `db/seed.sql` - Datos de ejemplo
- `app/api/products/route.ts` - API de ejemplo
