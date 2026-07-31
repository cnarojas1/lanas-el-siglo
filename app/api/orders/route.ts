import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";

type IncomingItem = { id: number; quantity: number };

type QuotePayload = {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  items?: IncomingItem[];
};

const MAX_UNITS_PER_LINE = 999;

/**
 * POST /api/orders — deja registrada una cotizacion.
 *
 * El cliente arma su bolsa y la envia por WhatsApp; esto solo guarda una copia
 * para que la tienda tenga el historial. Por eso:
 *
 * - Los datos de contacto son opcionales: el cliente se identifica en WhatsApp.
 * - NO se descuenta inventario. Una cotizacion no es una venta; descontar aqui
 *   vaciaria el stock con clics que nunca se concretan y terminaria bloqueando
 *   el boton por "agotado".
 *
 * El precio igual se lee de D1 y no del navegador, para que el historial
 * refleje el precio real de catalogo.
 */
export async function POST(request: Request) {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let payload: QuotePayload;
  try {
    payload = (await request.json()) as QuotePayload;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  // Se consolidan lineas repetidas del mismo producto.
  const quantities = new Map<number, number>();
  for (const item of payload.items ?? []) {
    const id = Number(item?.id);
    const quantity = Math.floor(Number(item?.quantity));
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) continue;
    quantities.set(id, Math.min((quantities.get(id) ?? 0) + quantity, MAX_UNITS_PER_LINE));
  }

  if (!quantities.size) {
    return Response.json({ error: "La cotización no tiene productos." }, { status: 400 });
  }

  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(", ");

  const { results: rows } = await env.DB.prepare(
    `SELECT id, name, price FROM products WHERE id IN (${placeholders}) AND visible = 1`
  )
    .bind(...ids)
    .all<{ id: number; name: string; price: number }>();

  const byId = new Map(rows.map((row) => [row.id, row]));
  const known = [...quantities].filter(([id]) => byId.has(id));

  if (!known.length) {
    return Response.json(
      { error: "Los productos de la cotización ya no están disponibles." },
      { status: 409 }
    );
  }

  const total = known.reduce((sum, [id, quantity]) => sum + (byId.get(id)?.price ?? 0) * quantity, 0);
  const quoteId = crypto.randomUUID();

  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (id, user_email, user_name, user_phone, total, status, shipping_address, notes)
       VALUES (?, ?, ?, ?, ?, 'cotizacion', '', ?)`
    ).bind(
      quoteId,
      (payload.email ?? "").trim(),
      (payload.name ?? "").trim(),
      (payload.phone ?? "").trim(),
      total,
      (payload.notes ?? "").trim()
    ),

    ...known.map(([id, quantity]) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`
      ).bind(quoteId, id, quantity, byId.get(id)?.price ?? 0)
    ),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error("No se pudo registrar la cotización:", error);
    return Response.json({ error: "No se pudo registrar la cotización." }, { status: 500 });
  }

  return Response.json(
    { id: quoteId, reference: quoteId.slice(0, 8).toUpperCase(), total },
    { status: 201 }
  );
}

/** GET /api/orders — cotizaciones registradas. Requiere ADMIN_TOKEN. */
export async function GET(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.user_name, o.user_email, o.user_phone, o.total, o.status,
            o.shipping_address, o.notes, o.created_at,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS lines,
            (SELECT GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ')
               FROM order_items oi JOIN products p ON p.id = oi.product_id
              WHERE oi.order_id = o.id) AS detail
     FROM orders o
     ORDER BY o.created_at DESC
     LIMIT 100`
  ).all();

  return Response.json({ orders: results });
}
