# ⚡ Quick Start - Pasos Finales

Todo está configurado localmente. Ahora solo necesitas:

## 1️⃣ Crear repositorio en GitHub (5 minutos)

### Opción A: CLI (recomendado)
Si tienes GitHub CLI instalado:
```bash
cd /Users/nicolasrojas/Documents/Lanas\ el\ Siglo
gh repo create lanas-el-siglo --public --source=. --remote=origin --push
```

### Opción B: Manualmente en web
1. Ve a https://github.com/new
2. **Repository name**: `lanas-el-siglo`
3. **Description**: "Ecommerce de lanas y fibras para tejido"
4. **Public** (para que Cloudflare lo despliegue)
5. Click **Create repository**
6. Luego copia el comando que aparece:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/lanas-el-siglo.git
   git branch -M main
   git push -u origin main
   ```

## 2️⃣ Configurar Cloudflare (10 minutos)

### A. Crear D1 Database
```bash
npm install wrangler -g
wrangler login
wrangler d1 create lanas-el-siglo-db
```
Copia el `database_id` que aparece.

### B. Editar wrangler.toml
Abre `wrangler.toml` y reemplaza:
- `account_id`: Tu Account ID (en dashboard.cloudflare.com)
- `database_id`: El ID que copiaste arriba

### C. Conectar Cloudflare Pages a GitHub
1. Ve a https://dash.cloudflare.com → Pages
2. **Connect to Git** → Autoriza GitHub
3. Selecciona `lanas-el-siglo`
4. Configuración:
   - **Framework**: None
   - **Build command**: `npm run build:sites`
   - **Output directory**: `dist`
   - **Node version**: `22.13.0`
5. **Deploy site**

### D. Agregar Secrets a GitHub Actions
Ve a tu repo en GitHub → Settings → Secrets and variables → Actions → New repository secret:
```
CLOUDFLARE_API_TOKEN = (de https://dash.cloudflare.com/profile/api-tokens)
CLOUDFLARE_ACCOUNT_ID = (tu account ID)
```

## 3️⃣ Verificar Deploy (2 minutos)

```bash
# Ver que está conectado a GitHub
git remote -v

# Ver historial de commits
git log --oneline -5

# Ver status
git status
```

Tu sitio debería estar en vivo en:
```
https://lanas-el-siglo.pages.dev
```

## 📋 Checklist Final

- [ ] Repositorio creado en GitHub
- [ ] Código pusheado (`git push`)
- [ ] D1 Database creada
- [ ] `wrangler.toml` actualizado
- [ ] Cloudflare Pages conectado
- [ ] Secrets agregados a GitHub Actions
- [ ] Deploy completado (ver en Cloudflare Pages)

## 🔗 URLs después del Deploy

- **Desarrollo local**: `npm run dev`
- **Preview en Cloudflare**: `https://lanas-el-siglo.pages.dev`
- **Producción**: (una vez agregues dominio personalizado)

## ⚠️ Notas Importantes

1. **No commits con secrets**: El `.env` está en `.gitignore`, bien hecho ✅
2. **Build automático**: Cada push a `main` despliega automáticamente
3. **Database**: D1 está en preview, perfecto para MVP
4. **Imágenes**: R2 está listo para subir imágenes de productos

## 🆘 Troubleshooting

### Build falla en Cloudflare Pages:
```bash
# Verifica localmente primero
npm run build:sites
npm run test
```

### GitHub Actions no despliega:
- Verifica secrets en Settings → Secrets
- Revisa logs en Actions → deploy workflow

### D1 no conecta:
```bash
# Verifica que el binding está en wrangler.toml
# y que el database_id es correcto
wrangler d1 list
```

---

📚 **Documentación completa**: Ver [DEPLOYMENT.md](./DEPLOYMENT.md) y [API_SETUP.md](./API_SETUP.md)
