import { env } from "cloudflare:workers";
import { authorize } from "@/lib/admin-auth";

type ProductPatch = {
  id?: number;
  name?: string;
  category?: string;
  price?: number;
  description?: string;
  visible?: boolean;
  image_source?: string;
};

/** PUT /api/admin/products — actualiza un producto existente. Requiere ADMIN_TOKEN. */
export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let patch: ProductPatch;
  try {
    patch = (await request.json()) as ProductPatch;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (typeof patch.id !== "number") {
    return Response.json({ error: "Falta el id del producto." }, { status: 400 });
  }

  // Solo se tocan las columnas presentes en el payload, para no borrar datos
  // con un formulario parcial.
  const sets: string[] = [];
  const values: unknown[] = [];

  const assign = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (typeof patch.name === "string" && patch.name.trim()) assign("name", patch.name.trim());
  if (typeof patch.category === "string" && patch.category.trim()) assign("category", patch.category.trim());
  if (typeof patch.price === "number" && Number.isFinite(patch.price) && patch.price >= 0) {
    assign("price", Math.round(patch.price));
  }
  if (typeof patch.description === "string") assign("description", patch.description);
  if (typeof patch.visible === "boolean") assign("visible", patch.visible ? 1 : 0);
  if (typeof patch.image_source === "string" && patch.image_source.trim()) {
    assign("image_source", patch.image_source.trim());
  }

  if (!sets.length) {
    return Response.json({ error: "No hay campos que actualizar." }, { status: 400 });
  }

  assign("updated_at", new Date().toISOString());

  const result = await env.DB.prepare(
    `UPDATE products SET ${sets.join(", ")} WHERE id = ?`
  )
    .bind(...values, patch.id)
    .run();

  if (!result.meta.changes) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  return Response.json({ updated: patch.id });
}

/** POST /api/admin/products — crea un nuevo producto. Requiere ADMIN_TOKEN. */
export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  let data: ProductPatch;
  try {
    data = (await request.json()) as ProductPatch;
  } catch {
    return Response.json({ error: "JSON invalido." }, { status: 400 });
  }

  // Set defaults
  const name = (data.name ?? "").trim();
  const category = (data.category ?? "").trim();
  const price = typeof data.price === "number" && Number.isFinite(data.price) && data.price >= 0 ? Math.round(data.price) : 0;
  const description = data.description ?? "";
  const visible = !!data.visible ? 1 : 0;
  const image_source = (data.image_source ?? "").trim();

  if (!name) {
    return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `INSERT INTO products (name, category, price, description, visible, image_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  )
    .bind(name, category, price, description, visible, image_source)
    .run();

  const id = (result.meta as { last_row_id?: number }).last_row_id;
  if (id === undefined) {
    return Response.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }

  return Response.json({ created: id });
}

/** DELETE /api/admin/products?id=... — elimina un producto. Requiere ADMIN_TOKEN. */
export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  if (!env.DB) {
    return Response.json({ error: "Base de datos no disponible." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Falta el id del producto." }, { status: 400 });
  }

  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return Response.json({ error: "ID de producto inválido." }, { status: 400 });
  }

  const result = await env.DB.prepare(
    `DELETE FROM products WHERE id = ?`
  )
    .bind(productId)
    .run();

  return Response.json({ deleted: result.meta.changes });
}