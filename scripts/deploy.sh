#!/usr/bin/env bash
# Deploy completo de Lanas El Siglo a Cloudflare Workers.
# Incluye: build, deploy de Worker, migración de D1, y sync de medios R2.
#
# Requisitos:
#   - wrangler autenticado (OAuth o CLOUDFLARE_API_TOKEN)
#   - Si hay 2+ cuentas, setear CLOUDFLARE_ACCOUNT_ID=f7f6884635183bbdf2c77577001262cb
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-f7f6884635183bbdf2c77577001262cb}"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

echo "============================================"
echo "  DEPLOY — Lanas El Siglo"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# ── 1. Build ──
echo ""
echo "📦 [1/4] Build del Worker..."
npx vinext build

# ── 2. Deploy Worker ──
echo ""
echo "🚀 [2/4] Deploy del Worker a Cloudflare..."
npx vinext deploy

# ── 3. Migración D1 (estructura) ──
echo ""
echo "🗄️  [3/4] Migraciones D1 pendientes..."
for migration in db/migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "   Aplicando: $migration"
    npx wrangler d1 execute lanas-el-siglo-db --remote --file="$migration"
  fi
done

# ── 4. Sync de medios R2 locales → producción ──
echo ""
echo "🖼️  [4/4] Sync de medios R2..."
# Solo procesamos si hay medios locales con /api/media/ referenciados
LOCAL_MEDIA_COUNT=$(npx wrangler d1 execute lanas-el-siglo-db --local \
  --command="SELECT COUNT(*) as c FROM media WHERE kv_key NOT LIKE '%logo%'" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['results'][0]['c'])" 2>/dev/null || echo "0")

if [ "$LOCAL_MEDIA_COUNT" -gt 0 ] 2>/dev/null; then
  echo "   Detectados $LOCAL_MEDIA_COUNT medios locales. Sincronizando con R2 producción..."
  python3 "$SCRIPT_DIR/sync-media-to-r2.py"
else
  echo "   Sin medios locales nuevos. Omitiendo sync."
fi

echo ""
echo "✅ Deploy completo."
echo "   Producción: https://lanas-el-siglo.cnarojas1.workers.dev"
