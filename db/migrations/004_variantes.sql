-- Variantes de producto: cada codigo/color puede tener su propia foto.
-- Un producto sin variantes sigue funcionando con su image_source unica.
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  color_name TEXT DEFAULT '',
  image_source TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (product_id, code)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
