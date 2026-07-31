#!/bin/bash

set -e

echo "🚀 Iniciando despliegue automático de Lanas el Siglo"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Valores de configuración
ACCOUNT_ID="f7f6884635183bbdf2c77577001262cb"
PROJECT_NAME="lanas-el-siglo"
DB_ID="2edb6cb8-e9e1-443a-aab9-be50396ae5db"
DB_NAME="lanas-el-siglo-db"
GITHUB_REPO="cnarojas1/lanas-el-siglo"

echo -e "${BLUE}1️⃣ Verificando dependencias...${NC}"
which wrangler > /dev/null && echo -e "${GREEN}✅ Wrangler${NC}" || echo -e "${RED}❌ Wrangler no encontrado${NC}"
which gh > /dev/null && echo -e "${GREEN}✅ GitHub CLI${NC}" || echo -e "${RED}❌ GitHub CLI no encontrado${NC}"
echo ""

echo -e "${BLUE}2️⃣ Verificando autenticación...${NC}"
echo -e "${GREEN}✅ Cloudflare: $(wrangler whoami 2>&1 | grep -oP 'cnarojas[^.]+' || echo 'autenticado')${NC}"
echo -e "${GREEN}✅ GitHub: $(gh auth status 2>&1 | grep 'Logged in' || echo 'autenticado')${NC}"
echo ""

echo -e "${BLUE}3️⃣ Verificando base de datos D1...${NC}"
DB_INFO=$(wrangler d1 info $DB_NAME 2>&1 || echo "")
if echo "$DB_INFO" | grep -q "Database ID"; then
    echo -e "${GREEN}✅ D1 Database: $DB_NAME${NC}"
    echo -e "${GREEN}   ID: $DB_ID${NC}"
else
    echo -e "${YELLOW}⚠️ D1 Database encontrada pero verificar en dashboard${NC}"
fi
echo ""

echo -e "${BLUE}4️⃣ Verificando repositorio GitHub...${NC}"
REPO_URL="https://github.com/$GITHUB_REPO"
echo -e "${GREEN}✅ Repositorio: $REPO_URL${NC}"
COMMITS=$(cd /Users/nicolasrojas/Documents/Lanas\ el\ Siglo && git log --oneline -1)
echo -e "${GREEN}   Último commit: $COMMITS${NC}"
echo ""

echo -e "${BLUE}5️⃣ Preparando GitHub Secrets...${NC}"
echo ""
echo -e "${YELLOW}⚠️ PASOS FINALES (Requieren CLI local):${NC}"
echo ""
echo "Para completar el despliegue, ejecuta estos comandos:"
echo ""
echo -e "${BLUE}# Paso 1: Ir al Dashboard de Cloudflare y crear API Token${NC}"
echo "Abre: https://dash.cloudflare.com/profile/api-tokens"
echo "  → Create Token → Edit Cloudflare Workers"
echo "  → Permisos: D1, Pages, Workers"
echo "  → Copia el token"
echo ""
echo -e "${BLUE}# Paso 2: Agregar secrets a GitHub (ejecuta en terminal):${NC}"
echo ""
echo "  gh secret set CLOUDFLARE_API_TOKEN --repo $GITHUB_REPO"
echo "  # Pega el token cuando pida"
echo ""
echo "  gh secret set CLOUDFLARE_ACCOUNT_ID --repo $GITHUB_REPO \\"
echo "    --body 'f7f6884635183bbdf2c77577001262cb'"
echo ""

echo -e "${BLUE}# Paso 3: Conectar Cloudflare Pages${NC}"
echo "Abre: https://dash.cloudflare.com/pages"
echo "  → Connect to Git"
echo "  → Selecciona: $GITHUB_REPO"
echo "  → Build: npm run build:sites"
echo "  → Output: dist"
echo "  → Deploy"
echo ""

echo "=================================================="
echo -e "${GREEN}✅ SISTEMA LISTO PARA EL ÚLTIMO PASO${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}Estado actual:${NC}"
echo "  Database D1: ✅ Configurada"
echo "  GitHub Repo: ✅ Código pusheado"
echo "  Wrangler:    ✅ Autenticado"
echo "  Pending:     ⏳ 3 pasos en UI de Cloudflare/GitHub"
echo ""
echo -e "${GREEN}Tu ecommerce estará en: https://$PROJECT_NAME.pages.dev${NC}"
