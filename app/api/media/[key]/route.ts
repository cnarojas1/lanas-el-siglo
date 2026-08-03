import { env } from "cloudflare:workers";

type Params = { params: Promise<{ key: string }> };

const LONG_CACHE = 60 * 60 * 24 * 31; // 31 dias (maximo del plan free).

/**
 * GET /api/media/[key] — entrega el binario guardado en R2.
 * Publico: son imagenes del catalogo.
 *
 * Las claves llevan un prefijo aleatorio, asi que el contenido de una clave
 * nunca cambia. Se sirve con Cache-Control immutable para que Cloudflare lo
 * cachee en el borde sin tocar R2 en cada request. (Sin uso manual de
 * caches.default: dentro de vinext eso rompe los headers del Response RSC.)
 */
export async function GET(request: Request, { params }: Params) {
  const { key } = await params;

  if (!env.MEDIA) {
    return new Response("Almacenamiento no disponible.", { status: 503 });
  }

  const object = await env.MEDIA.get(key);

  if (!object) {
    return new Response("No encontrado.", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", `public, max-age=${LONG_CACHE}, immutable`);
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}
