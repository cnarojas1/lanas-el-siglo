import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/admin-pass";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number;
  password_hash: string;
};

const roles = ["admin", "editor", "viewer"] as const;
type Role = (typeof roles)[number];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}

/** GET /api/admin/users — lista usuarios. Requiere sesion (admin). */
export async function GET(request: Request) {
  const auth = await requireRole(request, "admin");
  if (!auth.ok) return auth.response;
  if (!env.DB) return Response.json({ error: "Base de datos no disponible." }, { status: 503 });

  const { results } = await env.DB.prepare(
    `SELECT id, name, email, role, active, created_at FROM admin_users ORDER BY id`
  )
    .all<{ id: number; name: string; email: string; role: string; active: number; created_at: string }>();

  return Response.json({
    users: results,
    // El super-admin via ADMIN_TOKEN no es un usuario en la base.
    bootstrapAuth: auth.bootstrap,
  });
}

type UpsertBody = {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  active?: boolean;
};

/** POST /api/admin/users — crea un usuario nuevo. Requiere admin. */
export async function POST(request: Request) {
  const auth = await requireRole(request, "admin");
  if (!auth.ok) return auth.response;
  if (!env.DB) return Response.json({ error: "Base de datos no disponible." }, { status: 503 });

  let payload: UpsertBody;
  try {
    payload = (await request.json()) as UpsertBody;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const name = (payload.name ?? "").trim();
  const password = payload.password ?? "";
  const role = payload.role ?? "viewer";

  if (!email || !name) {
    return Response.json({ error: "Faltan correo y nombre." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }
  if (!isRole(role)) {
    return Response.json({ error: "Rol invalido." }, { status: 400 });
  }

  const existing = await env.DB.prepare(`SELECT id FROM admin_users WHERE email = ?`)
    .bind(email)
    .first<{ id: number }>();
  if (existing) {
    return Response.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  }

  const password_hash = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
  )
    .bind(name, email, password_hash, role)
    .run();

  const created = await env.DB.prepare(`SELECT id FROM admin_users WHERE email = ?`)
    .bind(email)
    .first<{ id: number }>();

  return Response.json({ created: created?.id ?? 0 }, { status: 201 });
}

/** PUT /api/admin/users — actualiza nombre, rol, activo o contrasena. */
export async function PUT(request: Request) {
  const auth = await requireRole(request, "admin");
  if (!auth.ok) return auth.response;
  if (!env.DB) return Response.json({ error: "Base de datos no disponible." }, { status: 503 });

  let payload: UpsertBody;
  try {
    payload = (await request.json()) as UpsertBody;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!Number.isInteger(payload.id)) {
    return Response.json({ error: "Falta el id del usuario." }, { status: 400 });
  }

  const user = await env.DB.prepare(
    `SELECT id, name, email, role, active, password_hash FROM admin_users WHERE id = ?`
  )
    .bind(payload.id)
    .first<UserRow>();
  if (!user) {
    return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (typeof payload.name === "string" && payload.name.trim()) {
    sets.push("name = ?");
    values.push(payload.name.trim());
  }
  if (typeof payload.email === "string" && payload.email.trim()) {
    const email = payload.email.trim().toLowerCase();
    const clash = await env.DB.prepare(
      `SELECT id FROM admin_users WHERE email = ? AND id != ?`
    )
      .bind(email, payload.id)
      .first<{ id: number }>();
    if (clash) {
      return Response.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
    }
    sets.push("email = ?");
    values.push(email);
  }
  if (isRole(payload.role)) {
    sets.push("role = ?");
    values.push(payload.role);
  }
  if (typeof payload.active === "boolean") {
    sets.push("active = ?");
    values.push(payload.active ? 1 : 0);
  }
  if (typeof payload.password === "string" && payload.password) {
    if (payload.password.length < 8) {
      return Response.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }
    sets.push("password_hash = ?");
    values.push(await hashPassword(payload.password));
  }

  if (!sets.length) {
    return Response.json({ error: "No hay campos que actualizar." }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `UPDATE admin_users SET ${sets.join(", ")} WHERE id = ?`
  )
    .bind(...values, payload.id)
    .run();

  if (!result.meta.changes) {
    return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  return Response.json({ updated: payload.id });
}

/** DELETE /api/admin/users?id=N — elimina un usuario. */
export async function DELETE(request: Request) {
  const auth = await requireRole(request, "admin");
  if (!auth.ok) return auth.response;
  if (!env.DB) return Response.json({ error: "Base de datos no disponible." }, { status: 503 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Falta el id." }, { status: 400 });
  }

  // No te puedes eliminar a ti mismo a traves de una sesion normal.
  if (!auth.bootstrap && auth.user.uid === id) {
    return Response.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }

  const result = await env.DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(id).run();
  if (!result.meta.changes) {
    return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  return Response.json({ deleted: id });
}
