/**
 * Hashing de contrasenas del panel /admin.
 *
 * Usa PBKDF2 + SHA-256 via Web Crypto (disponible en Cloudflare Workers y en
 * runtimes modernos), sin dependencias externas.
 *
 * Formato almacenado:  pbkdf2$<iterations>$<salt_b64>$<hash_b64>
 */

// Cloudflare Workers limita PBKDF2 a 100.000 iteraciones.
const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // bytes
const PREFIX = "pbkdf2";

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Deriva la clave PBKDF2 en bytes a partir del secreto y la sal. */
async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(key)}`;
}

const equalBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** Verifica una contrasena contra el hash almacenado. Tiempo constante. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = b64ToBytes(parts[2]);
  const expected = b64ToBytes(parts[3]);
  const derived = await derive(password, salt, iterations);
  return equalBytes(derived, expected);
}

/**
 * Crea un token de sesion opaco firmado con HMAC (Web Crypto). La sesion viaja
 * como cabecera `Authorization: Bearer <token>`.
 *
 * El token embebe: id de usuario, expiracion y firma. No hay server-side state.
 */
export async function signSessionToken(
  secret: string,
  payload: { uid: number; email: string; role: string },
  ttlSeconds = 60 * 60 * 12
): Promise<string> {
  const alg = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    alg,
    false,
    ["sign", "verify"]
  );
  const body = JSON.stringify({
    uid: payload.uid,
    email: payload.email,
    role: payload.role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
  const bodyBytes = new TextEncoder().encode(body);
  const sig = new Uint8Array(await crypto.subtle.sign(alg.name, key, bodyBytes));
  return `${btoa(body)}.${bytesToB64(sig)}`;
}

export type SessionPayload = {
  uid: number;
  email: string;
  role: string;
  exp: number;
};

/** Valida un token de sesion y devuelve su payload si es valido y vigente. */
export async function verifySessionToken(
  secret: string,
  token: string
): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const bodyRaw = token.slice(0, dot);
  const sigRaw = token.slice(dot + 1);

  const alg = { name: "HMAC", hash: "SHA-256" };
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      alg,
      false,
      ["sign", "verify"]
    );
    const valid = await crypto.subtle.verify(
      alg.name,
      key,
      b64ToBytes(sigRaw) as BufferSource,
      b64ToBytes(bodyRaw) as BufferSource
    );
    if (!valid) return null;
    const payload = JSON.parse(atob(bodyRaw)) as SessionPayload;
    if (!Number.isInteger(payload.uid) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
