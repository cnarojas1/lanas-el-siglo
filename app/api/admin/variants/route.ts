import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";

type VariantPayload = {
  product_id?: number;
  code?: string;
  color_name?: string;
  image_source?: string;
};

type SeedPayload = {
  product_id?: number;
  codes?: string[];
  images?: string[];
};

/** Siguiente codigo libre: continua la numeracion que ya usa el producto. */
function nextCode(existing: { code: string }[], offset: number) {
  const numeric = existing
    .map((row) => Number(row.code))
    .filter((value) => Number.isFinite(value));
  const base = numeric.length ? Math.max(...numeric) : 0;
  return String(base + offset);
}

/** GET /api/admin/variants?product_id=1 — variantes de un producto. Lectura publica. */
export async function GET(request: Request) {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const productId = Number(new URL(request.url).searchParams.get("product_id"));
  if (!Number.isInteger(productId) || productId <= 0) {
    return Response.json({ error: "Falta product_id." }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, product_id, code, color_name, image_source, sort_order
     FROM product_variants
     WHERE product_id = ?
     ORDER BY sort_order, id`
  )
    .bind(productId)
    .all();

  return Response.json({ variants: results });
}

/**
 * POST /api/admin/variants — crea las variantes que falten a partir de una
 * lista de codigos. Es idempotente: los codigos ya existentes se ignoran, asi
 * que volver a pulsar el boton no duplica ni pisa las imagenes asignadas.
 */
export async function POST(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let payload: SeedPayload;
  try {
    payload = (await request.json()) as SeedPayload;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const productId = payload.product_id;
  if (!Number.isInteger(productId)) {
    return Response.json({ error: "Falta product_id." }, { status: 400 });
  }

  const codes = (payload.codes ?? [])
    .map((code) => String(code).trim())
    .filter(Boolean)
    .slice(0, 300);

  const images = (payload.images ?? [])
    .map((url) => String(url).trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!codes.length && !images.length) {
    return Response.json({ error: "No hay nada que agregar." }, { status: 400 });
  }

  const statements = codes.map((code, index) =>
    env.DB.prepare(
      `INSERT INTO product_variants (product_id, code, sort_order)
       VALUES (?, ?, ?)
       ON CONFLICT (product_id, code) DO NOTHING`
    ).bind(productId, code, index)
  );

  // Las fotos se reparten primero entre los codigos que aun no tienen imagen;
  // las sobrantes crean codigos nuevos siguiendo la numeracion del producto.
  if (images.length) {
    const { results: current } = await env.DB.prepare(
      `SELECT id, code, image_source, sort_order FROM product_variants
       WHERE product_id = ? ORDER BY sort_order, id`
    )
      .bind(productId)
      .all<{ id: number; code: string; image_source: string; sort_order: number }>();

    const empty = current.filter((row) => !row.image_source);
    let created = 0;

    images.forEach((url, index) => {
      const slot = empty[index];
      if (slot) {
        statements.push(
          env.DB.prepare("UPDATE product_variants SET image_source = ? WHERE id = ?").bind(url, slot.id)
        );
        return;
      }

      created += 1;
      statements.push(
        env.DB.prepare(
          `INSERT INTO product_variants (product_id, code, image_source, sort_order)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (product_id, code) DO NOTHING`
        ).bind(productId, nextCode(current, created), url, current.length + created)
      );
    });
  }

  await env.DB.batch(statements);

  const { results } = await env.DB.prepare(
    `SELECT id, product_id, code, color_name, image_source, sort_order
     FROM product_variants WHERE product_id = ? ORDER BY sort_order, id`
  )
    .bind(productId)
    .all();

  return Response.json({ variants: results });
}

/** PUT /api/admin/variants — actualiza color e imagen de una variante. */
export async function PUT(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let patch: VariantPayload & { id?: number };
  try {
    patch = (await request.json()) as VariantPayload & { id?: number };
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!Number.isInteger(patch.id)) {
    return Response.json({ error: "Falta el id de la variante." }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (typeof patch.code === "string" && patch.code.trim()) {
    sets.push("code = ?");
    values.push(patch.code.trim());
  }
  if (typeof patch.color_name === "string") {
    sets.push("color_name = ?");
    values.push(patch.color_name.trim());
  }
  if (typeof patch.image_source === "string") {
    sets.push("image_source = ?");
    values.push(patch.image_source.trim());
  }

  if (!sets.length) {
    return Response.json({ error: "No hay campos que actualizar." }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `UPDATE product_variants SET ${sets.join(", ")} WHERE id = ?`
  )
    .bind(...values, patch.id)
    .run();

  if (!result.meta.changes) {
    return Response.json({ error: "Variante no encontrada." }, { status: 404 });
  }

  return Response.json({ updated: patch.id });
}

/** DELETE /api/admin/variants?id=12 */
export async function DELETE(request: Request) {
  const auth = authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Falta el id." }, { status: 400 });
  }

  const result = await env.DB.prepare("DELETE FROM product_variants WHERE id = ?").bind(id).run();

  if (!result.meta.changes) {
    return Response.json({ error: "Variante no encontrada." }, { status: 404 });
  }

  return Response.json({ deleted: id });
}
