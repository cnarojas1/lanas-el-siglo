import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";

type IncomingItem = { id: number; quantity: number };

type OrderPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  items?: IncomingItem[];
};

const MAX_UNITS_PER_LINE = 999;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * POST /api/orders — registra un pedido.
 *
 * El precio NUNCA se toma del navegador: se lee de D1 al momento de cobrar, de
 * modo que manipular el carrito en el cliente no cambia el total.
 */
export async function POST(request: Request) {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let payload: OrderPayload;
  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const phone = (payload.phone ?? "").trim();
  const address = (payload.address ?? "").trim();
  const notes = (payload.notes ?? "").trim();

  if (!name) return Response.json({ error: "Falta tu nombre." }, { status: 400 });
  if (!isEmail(email)) return Response.json({ error: "El correo no es válido." }, { status: 400 });
  if (!address) return Response.json({ error: "Falta la dirección de despacho." }, { status: 400 });

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
    return Response.json({ error: "El pedido no tiene productos." }, { status: 400 });
  }

  const ids = [...quantities.keys()];
  const placeholders = ids.map(() => "?").join(", ");

  const { results: rows } = await env.DB.prepare(
    `SELECT p.id, p.name, p.price, p.visible, COALESCE(i.quantity_available, 0) AS stock
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id IN (${placeholders})`
  )
    .bind(...ids)
    .all<{ id: number; name: string; price: number; visible: number; stock: number }>();

  const byId = new Map(rows.map((row) => [row.id, row]));

  const unavailable: string[] = [];
  const outOfStock: { name: string; requested: number; stock: number }[] = [];

  for (const [id, quantity] of quantities) {
    const row = byId.get(id);
    if (!row || row.visible !== 1) {
      unavailable.push(String(id));
      continue;
    }
    if (row.stock < quantity) {
      outOfStock.push({ name: row.name, requested: quantity, stock: row.stock });
    }
  }

  if (unavailable.length) {
    return Response.json(
      { error: "Hay productos que ya no están disponibles. Actualiza la página." },
      { status: 409 }
    );
  }

  if (outOfStock.length) {
    return Response.json(
      {
        error: outOfStock
          .map((item) =>
            item.stock === 0
              ? `"${item.name}" está agotado.`
              : `De "${item.name}" quedan ${item.stock} y pediste ${item.requested}.`
          )
          .join(" "),
        outOfStock,
      },
      { status: 409 }
    );
  }

  const total = [...quantities].reduce(
    (sum, [id, quantity]) => sum + (byId.get(id)?.price ?? 0) * quantity,
    0
  );
  const orderId = crypto.randomUUID();

  // Todo en un batch: D1 lo ejecuta como una transaccion, asi que si el stock
  // no alcanza, el CHECK del inventario aborta tambien el pedido y sus lineas.
  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (id, user_email, user_name, user_phone, total, status, shipping_address, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).bind(orderId, email, name, phone, total, address, notes),

    ...[...quantities].map(([id, quantity]) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`
      ).bind(orderId, id, quantity, byId.get(id)?.price ?? 0)
    ),

    ...[...quantities].map(([id, quantity]) =>
      env.DB.prepare(
        `UPDATE inventory SET quantity_available = quantity_available - ? WHERE product_id = ?`
      ).bind(quantity, id)
    ),
  ];

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // La violacion del CHECK significa que alguien compro las ultimas unidades
    // entre la verificacion y el cobro.
    if (message.includes("CHECK") || message.includes("constraint")) {
      return Response.json(
        { error: "Alguien tomó las últimas unidades mientras confirmabas. Revisa tu bolsa." },
        { status: 409 }
      );
    }
    console.error("No se pudo registrar el pedido:", error);
    return Response.json({ error: "No se pudo registrar el pedido." }, { status: 500 });
  }

  return Response.json(
    { id: orderId, reference: orderId.slice(0, 8).toUpperCase(), total },
    { status: 201 }
  );
}

/** GET /api/orders — listado para el panel. Requiere ADMIN_TOKEN. */
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
