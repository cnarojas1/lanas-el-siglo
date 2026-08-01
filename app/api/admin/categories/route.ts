import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/admin-auth";

type CategoriasRow = { category: string; total: number };

/**
 * GET /api/admin/categories — categorias reales (distintas de products.category)
 * con su cantidad de productos. Lectura publica (el listado del panel lo muestra
 * aun sin sesion).
 */
export async function GET() {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const { results } = await env.DB.prepare(
    `SELECT category, COUNT(*) AS total FROM products WHERE category <> '' GROUP BY category ORDER BY category`
  ).all<CategoriasRow>();

  return Response.json({ categories: results });
}

type RenameBody = { from?: string; to?: string };

/**
 * POST /api/admin/categories/rename — renombra una categoria en todos los
 * productos que la usan. Requiere sesion (editor o admin).
 */
export async function POST(request: Request) {
  const auth = await requireRole(request, "editor");
  if (!auth.ok) return auth.response;
  if (!env.DB) return Response.json({ error: "Base de datos no disponible." }, { status: 503 });

  let payload: RenameBody;
  try {
    payload = (await request.json()) as RenameBody;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const from = (payload.from ?? "").trim();
  const to = (payload.to ?? "").trim();

  if (!from || !to) {
    return Response.json({ error: "Faltan origen y destino." }, { status: 400 });
  }
  if (from === to) {
    return Response.json({ error: "Nombres iguales." }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `UPDATE products SET category = ? WHERE category = ? AND visible = 1`
  )
    .bind(to, from)
    .run();

  return Response.json({ renamed: result.meta.changes });
}
