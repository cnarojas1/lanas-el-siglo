-- Telefono de contacto del pedido.
ALTER TABLE orders ADD COLUMN user_phone TEXT NOT NULL DEFAULT '';

-- El stock no puede quedar negativo. SQLite no permite agregar un CHECK a una
-- tabla existente, asi que se reconstruye.
--
-- Con esta restriccion, descontar mas unidades de las disponibles aborta la
-- transaccion completa del pedido en vez de dejar el inventario en negativo:
-- la imposibilidad de sobrevender queda en el esquema, no en el codigo.
CREATE TABLE inventory_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL UNIQUE,
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved INTEGER DEFAULT 0,
  last_restocked DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO inventory_new (id, product_id, quantity_available, quantity_reserved, last_restocked, created_at)
SELECT id, product_id, quantity_available, quantity_reserved, last_restocked, created_at FROM inventory;

DROP TABLE inventory;
ALTER TABLE inventory_new RENAME TO inventory;

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
