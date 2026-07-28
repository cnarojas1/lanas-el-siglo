"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  color: string;
  price: number;
  weight: string;
  fiber: string;
  imagePosition: string;
};

const products: Product[] = [
  { id: 1, name: "Merino Natural", category: "Lanas clásica", color: "Crema", price: 6990, weight: "100 g", fiber: "Lana clásica suave", imagePosition: "0% center" },
  { id: 2, name: "Nube Rosada", category: "Lanas baby", color: "Rosa", price: 5490, weight: "100 g", fiber: "Suave para tejidos de bebé", imagePosition: "33% center" },
  { id: 3, name: "Bosque Suave", category: "Lanas batik", color: "Verde", price: 6990, weight: "100 g", fiber: "Coloración batik", imagePosition: "66% center" },
  { id: 4, name: "Tierra Andina", category: "Lanas con % lana", color: "Terracota", price: 7990, weight: "100 g", fiber: "Mezcla con lana", imagePosition: "100% center" },
  { id: 5, name: "Arena Natural", category: "Lanas clásica", color: "Arena", price: 4990, weight: "100 g", fiber: "Lana clásica versátil", imagePosition: "0% center" },
  { id: 6, name: "Malva Serena", category: "Lanas Fantasía", color: "Malva", price: 3990, weight: "100 g", fiber: "Textura de fantasía", imagePosition: "33% center" },
  { id: 7, name: "Oliva Campestre", category: "Lanas con % lana", color: "Oliva", price: 7990, weight: "100 g", fiber: "Mezcla con lana", imagePosition: "66% center" },
  { id: 8, name: "Canela Cálida", category: "Lanas baby", color: "Canela", price: 3990, weight: "100 g", fiber: "Suave para tejidos de bebé", imagePosition: "100% center" },
];

const categories = ["Todas", "Lanas clásica", "Lanas baby", "Lanas batik", "Lanas Fantasía", "Lanas con % lana"];

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function Home() {
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesText = !text || `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(text);
      return matchesCategory && matchesText;
    });
  }, [category, query]);

  const cartItems = products.filter((product) => cart[product.id]);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = cartItems.reduce((sum, product) => sum + product.price * cart[product.id], 0);

  function addToCart(id: number) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    setNotice("Producto agregado a tu bolsa");
    window.setTimeout(() => setNotice(""), 1800);
  }

  function updateQuantity(id: number, change: number) {
    setCart((current) => {
      const next = Math.max(0, (current[id] ?? 0) + change);
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  }

  async function copyOrder() {
    const details = cartItems
      .map((product) => `${cart[product.id]} × ${product.name} — ${money.format(product.price * cart[product.id])}`)
      .join("\n");
    const message = `Hola, quisiera solicitar este pedido:\n\n${details}\n\nTotal: ${money.format(cartTotal)}`;
    await navigator.clipboard.writeText(message);
    setNotice("Pedido copiado. Ya puedes enviarlo por WhatsApp.");
    window.setTimeout(() => setNotice(""), 3000);
  }

  return (
    <main>
      <div className="shipping-bar">Despacho a todo Chile · Envío gratis sobre $45.000</div>

      <header className="site-header">
        <a className="brand brand-logo" href="#inicio" aria-label="Lanería El Siglo, inicio">
          <Image src="/logo-el-siglo.jpg" alt="Lanería El Siglo" width={1600} height={694} priority />
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Abrir menú">
          <span />
          <span />
        </button>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"} aria-label="Navegación principal">
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Inicio</a>
          <a href="#catalogo" onClick={() => setMenuOpen(false)}>Catálogo</a>
          <a href="#nosotros" onClick={() => setMenuOpen(false)}>Nosotros</a>
        </nav>
        <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Abrir bolsa, ${cartCount} productos`}>
          <span>Bolsa</span>
          <b>{cartCount}</b>
        </button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">COLOR, TEXTURA Y CALIDEZ</p>
          <h1>Lanas para crear a tu manera</h1>
          <p className="hero-text">Encuentra fibras suaves, colores únicos y todo lo que necesitas para tu próximo proyecto.</p>
          <a className="primary-button" href="#catalogo">Ver catálogo</a>
          <div className="hero-details" aria-label="Beneficios">
            <span>Fibras seleccionadas</span>
            <span>Despacho nacional</span>
          </div>
        </div>
        <div className="hero-image" role="img" aria-label="Ovillos de lana natural en colores crema, salvia, rosa y terracota" />
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ELIGE TU FAVORITA</p>
            <h2>Favoritos de la temporada</h2>
          </div>
          <p>Lanas suaves y versátiles para tejer prendas, accesorios y todo lo que imagines.</p>
        </div>

        <div className="catalog-tools">
          <div className="category-list" aria-label="Filtrar por categoría">
            {categories.map((item) => (
              <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <label className="search">
            <span>Buscar</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Color o tipo de lana" />
          </label>
        </div>

        <div className="product-grid">
          {filtered.map((product, index) => (
            <article className="product-card" key={product.id}>
              <div className="product-image" style={{ backgroundPosition: product.imagePosition }}>
                {index < 2 && <span className="product-badge">{index === 0 ? "Más vendido" : "Nuevo"}</span>}
                <button onClick={() => addToCart(product.id)} aria-label={`Agregar ${product.name} a la bolsa`}>+</button>
              </div>
              <div className="product-info">
                <div>
                  <p>{product.category} · {product.weight}</p>
                  <h3>{product.name}</h3>
                  <span>{product.fiber}</span>
                </div>
                <strong>{money.format(product.price)}</strong>
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <p className="empty-state">No encontramos lanas con ese criterio. Prueba con otro color o categoría.</p>}
      </section>

      <section className="promo-banners" aria-label="Colecciones destacadas">
        <article className="promo-banner promo-kit">
          <div className="promo-copy promo-copy-light">
            <p className="eyebrow">TODO PARA COMENZAR</p>
            <h2>Arma tu primer kit de tejido</h2>
            <p>Elige tus ovillos favoritos y encuentra los básicos para darle forma a tu próxima idea.</p>
            <a href="#catalogo">Explorar kits <span aria-hidden="true">→</span></a>
          </div>
        </article>
        <article className="promo-banner promo-colors">
          <div className="promo-copy promo-copy-dark">
            <p className="eyebrow">PALETA DE TEMPORADA</p>
            <h2>Colores que se sienten tan bien como se ven</h2>
            <p>Terracotas, verdes y rosas suaves para combinar sin complicaciones.</p>
            <a href="#catalogo">Ver colores <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </section>

      <section className="story-section" id="nosotros">
        <div className="story-card">
          <p className="eyebrow">HECHO PARA DISFRUTAR EL PROCESO</p>
          <h2>Tu próxima creación comienza con una buena lana</h2>
          <p>Seleccionamos fibras agradables al tacto, colores fáciles de combinar y formatos simples para que comprar sea tan entretenido como tejer.</p>
        </div>
        <div className="benefits">
          <article><span>01</span><h3>Compra sencilla</h3><p>Explora por fibra o color y arma tu bolsa en pocos pasos.</p></article>
          <article><span>02</span><h3>Ayuda cercana</h3><p>Te orientamos para elegir la lana adecuada para tu proyecto.</p></article>
          <article><span>03</span><h3>Envíos a Chile</h3><p>Recibe tus materiales donde estés, con seguimiento.</p></article>
        </div>
      </section>

      <section className="newsletter">
        <div>
          <p className="eyebrow">INSPIRACIÓN EN TU CORREO</p>
          <h2>Nuevos colores, ideas y descuentos</h2>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setNotice("¡Gracias! Te avisaremos de las novedades."); }}>
          <label>
            <span>Correo electrónico</span>
            <input required type="email" placeholder="tu@email.cl" />
          </label>
          <button type="submit">Quiero recibir novedades</button>
        </form>
      </section>

      <footer>
        <a className="brand brand-logo footer-logo" href="#inicio">
          <Image src="/logo-el-siglo.jpg" alt="Lanería El Siglo" width={1600} height={694} />
        </a>
        <p>Fibras, color y calidez para cada proyecto.</p>
        <div><a href="#catalogo">Catálogo</a><a href="#nosotros">Nosotros</a></div>
        <small>© 2026 Lanería El Siglo</small>
      </footer>

      {cartOpen && <button className="drawer-overlay" onClick={() => setCartOpen(false)} aria-label="Cerrar bolsa" />}
      <aside className={cartOpen ? "cart-drawer cart-open" : "cart-drawer"} aria-hidden={!cartOpen} aria-label="Bolsa de compras">
        <div className="drawer-header">
          <div><p className="eyebrow">TU SELECCIÓN</p><h2>Bolsa ({cartCount})</h2></div>
          <button onClick={() => setCartOpen(false)} aria-label="Cerrar">×</button>
        </div>
        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div className="empty-cart"><span>○</span><h3>Tu bolsa está vacía</h3><p>Agrega algunas lanas para comenzar tu próximo proyecto.</p><button onClick={() => setCartOpen(false)}>Explorar catálogo</button></div>
          ) : (
            cartItems.map((product) => (
              <article className="cart-item" key={product.id}>
                <div className="cart-thumb" style={{ backgroundPosition: product.imagePosition }} />
                <div><h3>{product.name}</h3><p>{product.color} · {product.weight}</p><strong>{money.format(product.price)}</strong>
                  <div className="quantity"><button onClick={() => updateQuantity(product.id, -1)} aria-label="Quitar uno">−</button><span>{cart[product.id]}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label="Agregar uno">+</button></div>
                </div>
              </article>
            ))
          )}
        </div>
        {cartItems.length > 0 && <div className="cart-summary"><div><span>Total</span><strong>{money.format(cartTotal)}</strong></div><p>El despacho se calcula al confirmar el pedido.</p><button onClick={copyOrder}>Copiar pedido para WhatsApp</button></div>}
      </aside>

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
