import { env } from "cloudflare:workers";

type Params = { params: Promise<{ key: string }> };

/**
 * GET /api/media/[key] — entrega el binario guardado en KV.
 * Publico: son imagenes del catalogo.
 */
export async function GET(_request: Request, { params }: Params) {
  const { key } = await params;

  if (!env.MEDIA) {
    return new Response("Almacenamiento no disponible.", { status: 503 });
  }

  const object = await env.MEDIA.getWithMetadata(key, { type: "arrayBuffer" });

  if (!object.value) {
    return new Response("No encontrado.", { status: 404 });
  }

  const metadata = object.metadata as { contentType?: string } | null;

  return new Response(object.value, {
    headers: {
      "Content-Type": metadata?.contentType || "application/octet-stream",
      // La clave lleva un prefijo aleatorio, asi que el contenido nunca cambia.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
