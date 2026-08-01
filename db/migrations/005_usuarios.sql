-- Cuentas de usuario del panel /admin.
-- Reemplaza la contrasena compartida ADMIN_TOKEN por cuentas por persona.
-- El primer usuario se crea con el token ADMIN_TOKEN (bootstrap); a partir de
-- ahi los administradores gestionan el resto desde el panel.
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  -- Hash PBKDF2 (Web Crypto): formato  pbkdf2$<iterations>$<salt_b64>$<hash_b64>
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
