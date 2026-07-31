-- Contenido editable del sitio (textos de hero, banners, FAQ).
-- Clave/valor para no migrar el esquema cada vez que se agrega un texto.
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Biblioteca de medios. El binario vive en KV; aqui solo los metadatos.
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kv_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

-- Visibilidad y descripcion editables desde el panel.
ALTER TABLE products ADD COLUMN visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT '';
