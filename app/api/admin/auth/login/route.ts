import { env } from "cloudflare:workers";
import { verifyPassword, signSessionToken } from "@/lib/admin-pass";

type LoginBody = { email?: string; password?: string };

/** POST /api/admin/auth/login — valida correo y contrasena, devuelve token. */
export async function POST(request: Request) {
  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const secret = (env as { ADMIN_TOKEN?: string }).ADMIN_TOKEN;
  if (!secret) {
    return Response.json(
      { error: "El panel no tiene contrasena configurada." },
      { status: 503 }
    );
  }

  let payload: LoginBody;
  try {
    payload = (await request.json()) as LoginBody;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  if (!email || !password) {
    return Response.json({ error: "Faltan correo o contraseña." }, { status: 400 });
  }

  const user = await env.DB.prepare(
    `SELECT id, name, email, password_hash, role, active FROM admin_users WHERE email = ?`
  )
    .bind(email)
    .first<{ id: number; name: string; email: string; password_hash: string; role: string; active: number }>();

  // Un solo mensaje para no filtrar si existe la cuenta.
  if (!user || user.active !== 1 || !(await verifyPassword(password, user.password_hash))) {
    return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  const token = await signSessionToken(secret, {
    uid: user.id,
    email: user.email,
    role: user.role,
  });

  return Response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
