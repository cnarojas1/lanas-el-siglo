import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/admin-auth";

/**
 * DELETE /api/admin/category?name=... — elimina una categoría estableciéndola como vacía
 * en todos los productos que la usan. Requiere rol editor o admin.
 */
export async function DELETE(request: Request) {
  const auth = await requireRole(request, "editor");
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return Response.json({ error: "Falta el nombre de la categoría." }, { status: 400 });
  }

  // Establecer categoría como cadena vacía para todos los productos que la usan
  const result = await env.DB.prepare(
    `UPDATE products SET category = '' WHERE category = ?`
  )
    .bind(name)
    .run();

  return Response.json({ updated: result.meta.changes });
}