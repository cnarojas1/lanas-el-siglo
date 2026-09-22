# Handoff — Lanas El Siglo: Subida de imágenes y carpetas en panel admin

**Fecha:** 2026-09-03  
**Repositorio:** `/Users/nicolasrojas/Projects/lanas-el-siglo`  
**Producción:** https://lanas-el-siglo.cnarojas1.workers.dev  
**Versión deploy:** `acf7283f-d46a-48ac-b77d-aabaa1d684a0`

---

## Resumen ejecutivo

Se implementó la capacidad de **subir imágenes individuales y carpetas completas** desde el panel de administración `/admin`, con feedback visual de rechazos y soporte para la columna `folder` en la biblioteca de medios.

---

## Archivos modificados

| Archivo | Cambio principal |
|---|---|
| `.dev.vars` (nuevo) | Variables de entorno local para desarrollo (`ADMIN_TOKEN`). |
| `app/api/admin/media/route.ts` | POST acepta campo `folder`; guarda en D1; devuelve `rejected[]` con motivo. |
| `app/admin/page.tsx` | UI: botón "Subir carpeta completa" (`webkitdirectory`), mensajes de rechazo, aviso para rol viewer. |

---

## Detalle de cambios

### 1. `.dev.vars` (local, git-ignored)
```bash
ADMIN_TOKEN="tu-token-real-aquí"
```
Permite loguearse en `localhost:5173/admin` y probar subidas sin tocar producción.

---

### 2. `app/api/admin/media/route.ts` — Endpoint POST `/api/admin/media`

**Antes:** solo recibía `files[]`, insertaba `kv_key, filename, content_type, size`.  
**Ahora:**
- Lee `folder` del `FormData` (string opcional).
- Si no viene, usa `"Sin carpeta"`.
- Inserta en tabla `media` con columna `folder` (ya existía en D1 local y remoto).
- Respuesta JSON:
  ```ts
  { uploaded: { id, kv_key, filename, content_type, size, created_at, folder, url }[],
    rejected: { filename: string, reason: string }[] }
  ```
- Validaciones existentes se mantienen: tipo MIME permitido, ≤ 10 MB.

---

### 3. `app/admin/page.tsx` — Panel de administración

#### A. Subida individual (`uploadAndApply`)
- Añade `form.append("folder", "Sin carpeta")` al FormData.
- Muestra notificación con **conteo de subidas y rechazos**:
  - `"3 foto(s) subidas. 1 rechazada(s): foto.heic (Tipo no permitido (image/heic))."`

#### B. **NUEVO** Subida de carpeta completa (`handleFolderUpload`)
- Botón/label **"Subir carpeta completa"** con `<input type="file" webkitdirectory multiple accept="image/*">`.
- Al seleccionar carpeta, extrae el nombre de la carpeta raíz desde `webkitRelativePath` del primer archivo.
- Envía ese nombre como `folder` en el FormData.
- Sube todos los archivos de la carpeta en una sola petición.
- Notificación: `"12 foto(s) subidas a la carpeta "Atlas sport". 0 rechazada(s)."`
- Si el target es "bulk" (modal "Agregar fotos"), marca las imágenes subidas automáticamente.

#### C. UX para rol **viewer** (solo lectura)
- En lugar de botones mudos, muestra:
  > *"Tu rol es de solo lectura: no puedes subir imágenes ni carpetas"*
- Aplica tanto a "Agregar fotos" como a "Subir carpeta completa".

#### D. Estilos CSS
- `.admin-folder-upload-btn` añadido (label estilo botón con input oculto).
- Hereda estilos de `.admin-variants-actions` y `.admin-variants-secondary`.

---

## Base de datos (D1)

Tabla `media` ya tenía columna `folder TEXT DEFAULT 'Sin carpeta'` (migración previa no versionada en git, presente en local y remoto).

```sql
CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kv_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  folder TEXT DEFAULT 'Sin carpeta'
);
```

---

## Verificación

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores (1 warning preexistente: `selectedVariant` unused) |
| `npx vinext build` | ✅ TypeScript OK (error `cloudflare:workers` es preexistente en otras rutas) |
| `npx vinext deploy` | ✅ Version `acf7283f-d46a-48ac-b77d-aabaa1d684a0` activa |

---

## Cómo probar

### Producción
1. https://lanas-el-siglo.cnarojas1.workers.dev/admin
2. Login con usuario **admin** o **editor**
3. Productos → Editar uno → sección "Más fotos de este producto"
4. Botones visibles:
   - **Agregar fotos** (abre modal con biblioteca + pestaña "Cargar nueva")
   - **Subir carpeta completa** (nuevo, abre selector nativo de carpeta)
5. Selecciona carpeta con imágenes → se suben y aparecen en biblioteca con esa carpeta.

### Local
```bash
cd /Users/nicolasrojas/Projects/lanas-el-siglo
# Edita .dev.vars con tu ADMIN_TOKEN real
npm run dev
# http://localhost:5173/admin → login → mismo flujo
```

---

## Formatos y límites

| Formato | Permitido |
|---|---|
| JPEG, PNG, WebP, GIF, AVIF, SVG | ✅ |
| HEIC (iPhone) | ❌ — se rechaza con mensaje claro |
| Tamaño máx. | 10 MB / archivo |

---

## Problemas conocidos / pendientes

1. **HEIC**: iPhone guarda en HEIC; el navegador y la API no lo aceptan. Flujo actual: convertir a WebP antes de subir (scripts externos).
2. **Build `next build`**: Falla por `cloudflare:workers` en otras rutas API (`/api/admin/category`, etc.). No afecta a este cambio; `npx vinext build` + `npx vinext deploy` funcionan.
3. **`.dev.vars`**: No está en git; cada desarrollador debe crear el suyo.

---

## Próximos pasos sugeridos

- [ ] Añadir script de conversión HEIC → WebP en `scripts/`.
- [ ] Migrar columna `folder` a git (migración D1 versionada).
- [ ] Añadir drag & drop de carpetas en la dropzone (además de `webkitdirectory`).
- [ ] Mostrar progreso de subida para carpetas grandes.

---

## Contacto

Cambios realizados por: asistente AI (Hermes)  
Para dudas: revisar diffs en `git diff HEAD~1 -- app/api/admin/media/route.ts app/admin/page.tsx`