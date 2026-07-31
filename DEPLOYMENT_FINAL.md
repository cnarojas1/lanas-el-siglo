# 🎯 ÚLTIMOS 3 PASOS - Sigue EXACTAMENTE esto

## ✅ Lo que ya está hecho:
- ✅ Repositorio GitHub creado
- ✅ Código en GitHub (pusheado)
- ✅ Base de datos D1 creada y configurada
- ✅ 9 productos cargados en la BD
- ✅ API de ejemplo lista
- ✅ Wrangler autenticado

## ⏳ Solo falta conectar Cloudflare Pages (10 minutos)

---

## 📋 PASO 1: Crear API Token en Cloudflare (5 min)

### Abre esta URL en tu navegador:
```
https://dash.cloudflare.com/profile/api-tokens
```

### Pasos a seguir:
1. Click en el botón azul **"Create Token"**
2. Ve a la sección de templates
3. Busca y selecciona: **"Edit Cloudflare Workers"**
4. Click **"Use template"**

### Configuración del token:
- **Token name:** `lanas-el-siglo-deployment` (o el que prefieras)
- **Permissions:** Deben aparecer automáticamente:
  - ✅ Account > D1 > Edit
  - ✅ Account > Cloudflare Pages > Manage
  - ✅ Account > Workers > Edit

Si falta algo, agrega:
- Haz click en **"Add more"**
- Busca "D1" y agrega "Edit"
- Busca "Pages" y agrega "Manage"

### Recursos:
- ✅ Account > Include > All accounts

5. Scroll down, click **"Continue to summary"**
6. Click **"Create Token"** (botón azul)

### ⭐ IMPORTANTE:
**Se mostrará el token una sola vez.** Cópialo inmediatamente:
- Click el ícono de copiar al lado del token
- O selecciona todo el texto y copia

**GUARDA ESTE TOKEN EN UN LUGAR SEGURO** (lo usarás en el Paso 2)

---

## 📝 PASO 2: Agregar Secrets a GitHub (3 min)

Abre tu Terminal/CMD y ejecuta estos comandos:

### Comando 1: Agregar el API Token
```bash
gh secret set CLOUDFLARE_API_TOKEN --repo cnarojas1/lanas-el-siglo
```

Cuando te pida el valor (que aparezca un editor o input):
- **Pega el token que copiaste en el Paso 1**
- Guarda/cierra el editor

### Comando 2: Agregar Account ID
```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --repo cnarojas1/lanas-el-siglo --body 'f7f6884635183bbdf2c77577001262cb'
```

✅ Si ves `✓ Set secret` → ¡Éxito!

---

## 🌐 PASO 3: Conectar Cloudflare Pages (2 min)

### Abre esta URL:
```
https://dash.cloudflare.com/pages
```

### Pasos:
1. Click en el botón **"Connect to Git"**
2. Selecciona **GitHub** (si pide autorización, autoriza)
3. Busca el repositorio: `cnarojas1/lanas-el-siglo`
4. Click sobre él para seleccionarlo

### Configuración del Build:

La pantalla mostrará varias opciones. Completa así:

```
Framework preset: None
Build command: npm run build:sites
Build output directory: dist
Root directory: /
```

### Environment Variables:

Click en **"Add environment variables"** (o similar):

```
NODE_VERSION = 22.13.0
NODE_ENV = production
```

### Deploy:

5. Click el botón **"Save and Deploy"** (azul)
6. Espera a que diga "✅ Deployment successful"

---

## 🎉 ¡LISTO!

Tu ecommerce estará en vivo en:
```
https://lanas-el-siglo.pages.dev
```

Verifica visitando esa URL. Deberías ver:
- El catálogo de lanas
- El header con logo
- El carrito de compras

---

## 🔄 Actualizaciones futuras

Cada vez que hagas `git push` a `main`, se desplegará automáticamente:

```bash
cd /Users/nicolasrojas/Documents/Lanas\ el\ Siglo
git add .
git commit -m "feat: descripción de cambios"
git push origin main
```

Cloudflare desplegará automáticamente en ~1-2 minutos.

---

## 📊 Verificar que todo está correcto

### En Cloudflare Dashboard:
1. Ve a: https://dash.cloudflare.com/pages
2. Selecciona `lanas-el-siglo`
3. Deberías ver:
   - ✅ Deployments: mostrando el último
   - ✅ Status: "Success"
   - ✅ Domain: https://lanas-el-siglo.pages.dev

### En GitHub:
1. Ve a: https://github.com/cnarojas1/lanas-el-siglo/settings/secrets/actions
2. Deberías ver 2 secrets:
   - ✅ CLOUDFLARE_API_TOKEN
   - ✅ CLOUDFLARE_ACCOUNT_ID

---

## ❓ Si algo falla

### Error: "Build failed"
```bash
# Verifica localmente
cd /Users/nicolasrojas/Documents/Lanas\ el\ Siglo
npm run build:sites
npm run test
```

### Error: "Token inválido"
- Revisa que copiaste el token completo (sin espacios)
- Crea uno nuevo en Cloudflare

### Error: "Repository not found"
- Verifica que el nombre sea exacto: `cnarojas1/lanas-el-siglo`
- Usa `gh repo view` para confirmar

---

## 🚀 Próximas features a implementar

Después de que esté en vivo, puedes agregar:
- [ ] Pagos con Stripe/Wompi
- [ ] Autenticación de usuarios
- [ ] Gestión de órdenes
- [ ] Email transaccional
- [ ] Admin panel
- [ ] Analytics

---

## 📞 Recursos

- **Documentación Cloudflare:** https://developers.cloudflare.com
- **Next.js Docs:** https://nextjs.org/docs
- **D1 Guide:** https://developers.cloudflare.com/d1
- **Troubleshooting:** Ver `CLOUDFLARE_SETUP.md`

---

**¡Eso es todo! Tu ecommerce estará en vivo en 10 minutos.** 🎊
