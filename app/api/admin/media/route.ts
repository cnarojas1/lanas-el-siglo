import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";
import { getRequestExecutionContext } from "vinext/shims/request-context";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB por archivo.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml"]);

type MediaRow = {
  id: number;
  kv_key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
  folder: string;
};

function withUrl(row: MediaRow) {
  return { ...row, url: `/api/media/${row.kv_key}` };
}

/** Nombre de archivo seguro para usar como clave de KV. */
function slugify(filename: string) {
  const dot = filename.lastIndexOf(".");
  const base = (dot > 0 ? filename.slice(0, dot) : filename)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  return `${base || "imagen"}.${ext}`;
}

/** GET /api/admin/media — lista la biblioteca. Lectura publica. */
export async function GET() {
  if (!env.DB || !env.MEDIA) {
    return Response.json({ error: "Almacenamiento no disponible." }, { status: 503 });
  }

  const { results } = await env.DB.prepare(
    "SELECT id, kv_key, filename, content_type, size, created_at, COALESCE(folder, 'Sin carpeta') AS folder FROM media ORDER BY folder COLLATE NOCASE, filename COLLATE NOCASE, id DESC"
  ).all<MediaRow>();

  const seen = new Set<string>();
  const media = results.filter((row) => {
    const key = `${row.folder || "Sin carpeta"}:${row.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return Response.json(
    { media: media.map(withUrl) },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

/**
 * POST /api/admin/media — sube uno o varios archivos (multipart, campo "files").
 * Requiere ADMIN_TOKEN.
 */
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB || !env.MEDIA) {
    return Response.json({ error: "Almacenamiento no disponible." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Se esperaba multipart/form-data." }, { status: 400 });
  }

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) {
    return Response.json({ error: "No se recibio ningun archivo." }, { status: 400 });
  }

  const uploaded: ReturnType<typeof withUrl>[] = [];
  const rejected: { filename: string; reason: string }[] = [];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      rejected.push({ filename: file.name, reason: `Tipo no permitido (${file.type || "desconocido"})` });
      continue;
    }
    if (file.size > MAX_BYTES) {
      rejected.push({ filename: file.name, reason: `Supera los 10 MB (${(file.size / 1048576).toFixed(1)} MB)` });
      continue;
    }

    // Prefijo aleatorio para que dos archivos con el mismo nombre no se pisen.
    const kvKey = `${crypto.randomUUID().slice(0, 8)}-${slugify(file.name)}`;

    await env.MEDIA.put(kvKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    try {
      const row = await env.DB.prepare(
        `INSERT INTO media (kv_key, filename, content_type, size)
         VALUES (?, ?, ?, ?)
         RETURNING id, kv_key, filename, content_type, size, created_at`
      )
        .bind(kvKey, file.name, file.type, file.size)
        .first<MediaRow>();

      if (row) uploaded.push(withUrl(row));
    } catch (error) {
      // Si D1 falla, el binario quedaria huerfano en KV: se limpia.
      await env.MEDIA.delete(kvKey);
      rejected.push({
        filename: file.name,
        reason: error instanceof Error ? error.message : "No se pudo registrar",
      });
    }
  }

  return Response.json({ uploaded, rejected }, { status: uploaded.length ? 201 : 400 });
}

/** DELETE /api/admin/media?key=... — borra un archivo. Requiere ADMIN_TOKEN. */
export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB || !env.MEDIA) {
    return Response.json({ error: "Almacenamiento no disponible." }, { status: 503 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Falta el parametro key." }, { status: 400 });
  }

  const result = await env.DB.prepare("DELETE FROM media WHERE kv_key = ?").bind(key).run();
  if (!result.meta.changes) {
    return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
  }

  await env.MEDIA.delete(key);

  // Invalida la copia cacheada en el borde para que la imagen borrada no siga
  // sirviendose desde cache.
  const origin = new URL(request.url).origin;
  const cacheKey = new Request(`${origin}/api/media/${key}`, { method: "GET" });
  getRequestExecutionContext()?.waitUntil(caches.default.delete(cacheKey));

  return Response.json({ deleted: key });
}
