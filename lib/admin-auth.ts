import { env } from "cloudflare:workers";
import { verifySessionToken, type SessionPayload } from "@/lib/admin-pass";

/**
 * Autorizacion del panel /admin.
 *
 * El panel /admin es publico, por lo que la autorizacion vive en la API. Hay dos
 * vias de acceso:
 *
 * 1. **Token de sesion** (normal): `Authorization: Bearer <token>` firmado con
 *    HMAC, emitido por `POST /api/admin/auth/login` tras validar correo y
 *    contrasena de un usuario en `admin_users`. El token es opaco y caduca.
 *
 * 2. **Bootstrap con ADMIN_TOKEN** (crear el primer usuario): si el header trae
 *    el secreto en crudo, se concede acceso de super-admin. Esto permite crear
 *    la primera cuenta cuando aun no hay ningun usuario en la base.
 *
 * El secreto de firma es el mismo `ADMIN_TOKEN`. Si no esta configurado, toda
 * escritura queda bloqueada (fail-closed) y el login no puede emitir tokens.
 */

export type AuthFailure = { ok: false; response: Response };
export type AuthSuccess = { ok: true; user: SessionPayload; bootstrap: boolean };
export type AuthResult = AuthSuccess | AuthFailure;

/** Devuelve el secreto de firma; null si no esta configurado. */
function secretKey(): string | null {
  return (env as { ADMIN_TOKEN?: string }).ADMIN_TOKEN || null;
}

function unauthorized(message: string, status = 401): AuthFailure {
  return { ok: false, response: Response.json({ error: message }, { status }) };
}

/**
 * Valida la cabecera Authorization. Devuelve la sesion del usuario autenticado.
 * Requiere el secreto configurado (fail-closed).
 */
export async function authorize(request: Request): Promise<AuthResult> {
  const secret = secretKey();
  if (!secret) {
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
  const value = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!value) {
    return unauthorized("No autorizado.");
  }

  // Bootstrap: el header trae el ADMIN_TOKEN en crudo -> super-admin.
  if (value.length === secret.length && safeEqual(value, secret)) {
    return {
      ok: true,
      bootstrap: true,
      user: { uid: 0, email: "", role: "admin", exp: Infinity },
    };
  }

  const session = await verifySessionToken(secret, value);
  if (!session) {
    return unauthorized("Tu sesión terminó (se pierde al cerrar la pestaña). Vuelve a ingresar tus datos.");
  }

  return { ok: true, bootstrap: false, user: session };
}

/**
 * Envuelve authorize exigiendo el rol minimo. 'admin' es el mayor nivel;
 * 'editor' puede escribir productos/categorias; 'viewer' solo lee.
 */
export async function requireRole(
  request: Request,
  minRole: "viewer" | "editor" | "admin" = "viewer"
): Promise<AuthResult> {
  const auth = await authorize(request);
  if (!auth.ok) return auth;
  const roleRank = { viewer: 0, editor: 1, admin: 2 };
  if (roleRank[auth.user.role as keyof typeof roleRank] < roleRank[minRole]) {
    return {
      ok: false,
      response: Response.json({ error: "No tienes permisos para esta acción." }, { status: 403 }),
    };
  }
  return auth;
}

/** Comparacion en tiempo constante para no filtrar por temporizacion. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
