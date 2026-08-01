import { env } from "cloudflare:workers";
import { getRequestExecutionContext } from "vinext/shims/request-context";

type Params = { params: Promise<{ key: string }> };

const LONG_CACHE = 60 * 60 * 24 * 31; // 31 dias (maximo del plan free).
const NEGATIVE_CACHE = 60; // 1 min para 404, para que una subida nueva aparezca rapido.

/**
 * GET /api/media/[key] — entrega el binario guardado en R2.
 * Publico: son imagenes del catalogo.
 *
 * Las claves llevan un prefijo aleatorio, asi que el contenido de una clave
 * nunca cambia. Por eso se cachea en el borde con 31 dias: una vez en cache,
 * Cloudflare responde las imagenes sin tocar R2 (ni siquiera en cada request),
 * lo que deja las lecturas de almacenamiento practicamente en cero.
 */
export async function GET(request: Request, { params }: Params) {
  const { key } = await params;

  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = caches.default;
  const ctx = getRequestExecutionContext();

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  if (!env.MEDIA) {
    return new Response("Almacenamiento no disponible.", { status: 503 });
  }

  const object = await env.MEDIA.get(key);

  if (!object) {
    // Cachea el 404 un minuto para no pegarle a R2 por cada imagen inexistente.
    const notFound = new Response("No encontrado.", {
      status: 404,
      headers: { "Cache-Control": `public, max-age=${NEGATIVE_CACHE}` },
    });
    ctx?.waitUntil(cache.put(cacheKey, notFound.clone()));
    return notFound;
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", `public, max-age=${LONG_CACHE}, immutable`);
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  const response = new Response(object.body, { headers });

  ctx?.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
