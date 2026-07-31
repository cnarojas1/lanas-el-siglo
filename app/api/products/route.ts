import { env } from "cloudflare:workers";

/**
 * GET /api/products
 * Lista productos desde la base de datos D1.
 * Filtros opcionales: ?category=...&search=...&limit=50&offset=0
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  if (!env.DB) {
    return Response.json(
      { error: "La base de datos D1 no está disponible en este entorno." },
      { status: 503 }
    );
  }

  const where: string[] = [];
  const values: unknown[] = [];

  if (category) {
    where.push("category = ?");
    values.push(category);
  }

  if (search) {
    where.push("(name LIKE ? OR category LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, category, color, fiber, weight, length, needles, crochet,
              price, kilo_price, dozen_price, image_source, image_position,
              image_size, color_count, all_colors, visible, description
       FROM products ${clause}
       ORDER BY category, name
       LIMIT ? OFFSET ?`
    )
      .bind(...values, limit, offset)
      .all();

    const total = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM products ${clause}`
    )
      .bind(...values)
      .first<{ total: number }>();

    return Response.json({
      data: results,
      pagination: { total: total?.total ?? 0, limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return Response.json({ error: message }, { status: 500 });
  }
}
