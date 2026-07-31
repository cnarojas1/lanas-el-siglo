# 🔌 API Setup - Lanas el Siglo

## Estructura de API Backend con Cloudflare Workers

Después de configurar Pages + Workers, agregamos las rutas de API para el ecommerce.

### 1. Crear rutas API en Next.js

Crea archivos en `app/api/`:

```
app/
├── api/
│   ├── products/
│   │   ├── route.ts          # GET /api/products
│   │   └── [id]/route.ts     # GET /api/products/[id]
│   ├── orders/
│   │   ├── route.ts          # POST /api/orders (crear orden)
│   │   └── [id]/route.ts     # GET /api/orders/[id]
│   ├── cart/
│   │   ├── route.ts          # POST /api/cart/checkout
│   │   └── validate/route.ts # POST /api/cart/validate
│   ├── inventory/
│   │   └── route.ts          # GET /api/inventory
│   └── payment/
│       └── webhook.ts        # POST /api/payment/webhook
```

### 2. Ejemplo: Obtener productos desde D1

**app/api/products/route.ts:**
```typescript
import { json } from 'next/server';

interface Env {
  DB: D1Database;
}

export async function GET(request: Request, { params }: { params: { env: Env } }) {
  const { DB } = params.env as unknown as Env;
  
  try {
    const products = await DB.prepare(
      'SELECT id, name, price, category, imageSource FROM products ORDER BY name'
    ).all();
    
    return json({ data: products.results });
  } catch (error) {
    return json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

### 3. Crear tablas en D1

**scripts/init-db.sql:**
```sql
-- Productos
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  fiber TEXT,
  weight TEXT,
  length TEXT,
  price DECIMAL(10, 2) NOT NULL,
  imageSource TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Órdenes
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  total DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  paymentId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items de órdenes
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  orderId TEXT NOT NULL,
  productId INTEGER NOT NULL,
  quantity INTEGER,
  price DECIMAL(10, 2),
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

-- Inventario
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  productId INTEGER NOT NULL UNIQUE,
  quantity INTEGER DEFAULT 0,
  FOREIGN KEY (productId) REFERENCES products(id)
);
```

Ejecutar:
```bash
npx wrangler d1 execute lanas-el-siglo-db --file scripts/init-db.sql --remote
```

### 4. Variables de entorno en Cloudflare

En el Dashboard → Pages → Settings → Environment variables:

```
DB = lanas-el-siglo-db (binding)
PRODUCTS_BUCKET = lanas-el-siglo-products (R2 binding)
STRIPE_SECRET_KEY = sk_test_...
STRIPE_PUBLIC_KEY = pk_test_...
```

### 5. Endpoints principales del ecommerce

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/products` | Listar todos los productos |
| GET | `/api/products/[id]` | Detalle de un producto |
| GET | `/api/inventory` | Verificar stock |
| POST | `/api/orders` | Crear orden |
| GET | `/api/orders/[id]` | Obtener estado de orden |
| POST | `/api/payment/checkout` | Iniciar pago (Stripe/Wompi) |
| POST | `/api/payment/webhook` | Webhook de pagos |
| POST | `/api/cart/validate` | Validar carrito |

### 6. Seguridad

Recuerda agregar en todos los endpoints:

```typescript
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.SHOP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limiting
import { getRemainingRequests } from '@cloudflare/workers-rate-limit';

// Validación de tokens
const token = request.headers.get('authorization')?.split(' ')[1];
if (!token || !verifyToken(token)) {
  return json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 📌 Próximos pasos:

1. Ejecutar `npm run db:generate` después de crear tablas
2. Migrar catálogo actual a D1
3. Implementar endpoints de checkout
4. Integrar Stripe/Wompi para pagos
5. Agregar autenticación con GitHub/Auth0
