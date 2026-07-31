/**
 * Genera db/seed.sql a partir de app/catalog-data.ts.
 *
 * Usa la misma fuente que renderiza el sitio, de modo que la base de datos y el
 * catalogo del frontend no puedan divergir. Ejecutar tras editar catalog-data.ts:
 *
 *   node scripts/generate-seed.mjs
 *   npx wrangler d1 execute lanas-el-siglo-db --file=db/seed.sql --remote
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "app", "catalog-data.ts");

const { code } = await esbuild.transform(readFileSync(source, "utf8"), {
  loader: "ts",
  format: "esm",
});

const scratch = join(mkdtempSync(join(tmpdir(), "seed-")), "catalog-data.mjs");
writeFileSync(scratch, code);

const { products } = await import(pathToFileURL(scratch).href);

const quote = (value) =>
  value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;

const columns = [
  "id",
  "name",
  "category",
  "color",
  "fiber",
  "weight",
  "length",
  "needles",
  "crochet",
  "price",
  "kilo_price",
  "dozen_price",
  "image_source",
  "image_position",
  "image_size",
  "color_count",
  "colors_with_photo",
  "all_colors",
];

const rows = products.map((p) =>
  "  (" +
  [
    p.id,
    quote(p.name),
    quote(p.category),
    quote(p.color),
    quote(p.fiber),
    quote(p.weight),
    quote(p.length),
    quote(p.needles),
    quote(p.crochet),
    p.price,
    quote(p.kiloPrice ?? ""),
    quote(p.dozenPrice ?? ""),
    quote(p.imageSource),
    quote(p.imagePosition),
    quote(p.imageSize),
    p.colorCount,
    quote(p.colorsWithPhoto ?? ""),
    quote(p.allColors ?? ""),
  ].join(", ") +
  ")"
);

const sql = `-- Generado por scripts/generate-seed.mjs desde app/catalog-data.ts.
-- No editar a mano: los cambios se pierden al regenerar.
-- Productos: ${products.length}

DELETE FROM inventory;
DELETE FROM products;

INSERT INTO products (${columns.join(", ")}) VALUES
${rows.join(",\n")};

-- Stock inicial para cada producto.
INSERT INTO inventory (product_id, quantity_available)
SELECT id, 100 FROM products;
`;

writeFileSync(join(root, "db", "seed.sql"), sql);
console.log(`db/seed.sql generado con ${products.length} productos.`);
