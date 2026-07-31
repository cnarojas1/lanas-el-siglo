import { env } from "cloudflare:workers";

/**
 * El panel /admin es publico, asi que la autorizacion vive en la API: sin un
 * token valido no se escribe nada en D1 ni en KV.
 *
 * El token se define como secreto del Worker:
 *   npx wrangler secret put ADMIN_TOKEN
 *
 * Si el secreto no existe, toda escritura queda bloqueada (fail-closed) en vez
 * de quedar abierta al publico.
 */

/** Comparacion en tiempo constante para no filtrar el token por temporizacion. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type AuthFailure = { ok: false; response: Response };
export type AuthSuccess = { ok: true };

export function authorize(request: Request): AuthSuccess | AuthFailure {
  const expected = (env as { ADMIN_TOKEN?: string }).ADMIN_TOKEN;

  if (!expected) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            "El panel no tiene contrasena configurada. Ejecuta `npx wrangler secret put ADMIN_TOKEN` y vuelve a desplegar.",
        },
        { status: 503 }
      ),
    };
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !safeEqual(token, expected)) {
    return {
      ok: false,
      response: Response.json({ error: "No autorizado." }, { status: 401 }),
    };
  }

  return { ok: true };
}
