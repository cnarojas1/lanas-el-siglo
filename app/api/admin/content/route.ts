import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";

/** GET /api/admin/content — textos guardados del sitio. Lectura publica. */
export async function GET() {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const { results } = await env.DB.prepare(
    "SELECT key, value FROM site_content"
  ).all<{ key: string; value: string }>();

  const content = Object.fromEntries(results.map((row) => [row.key, row.value]));
  return Response.json({ content });
}

/** PUT /api/admin/content — guarda los textos. Requiere ADMIN_TOKEN. */
export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const entries = Object.entries(payload).filter(
    ([key, value]) => typeof key === "string" && typeof value === "string"
  ) as [string, string][];

  if (!entries.length) {
    return Response.json({ error: "No hay textos que guardar." }, { status: 400 });
  }

  await env.DB.batch(
    entries.map(([key, value]) =>
      env.DB.prepare(
        `INSERT INTO site_content (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
      ).bind(key, value)
    )
  );

  return Response.json({ saved: entries.length });
}
