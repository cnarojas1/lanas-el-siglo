"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "./catalog-data";
import type { SiteContent } from "./site-content";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const DEPLOY_VERSION = "mobile-colors-2026-08-01-1138";

function swatchLabel(variant: ProductVariant) {
  return variant.colorName ? `${variant.code} · ${variant.colorName}` : variant.code;
}

function selectedVariant(product: Product, chosen: Record<number, number>) {
  return product.variants?.find((item) => item.id === chosen[product.id]);
}

function imageStyle(product: Product, variantId?: number) {
  const variant = product.variants?.find((item) => item.id === variantId);
  const source = variant?.imageSource || product.imageSource;
  const isPhoto = Boolean(variant) || source.startsWith("/api/media/");
  return {
    backgroundImage: `url("${source}")`,
    backgroundPosition: isPhoto ? "center" : product.imagePosition,
    backgroundSize: isPhoto ? "cover" : product.imageSize,
  };
}

type StorefrontProps = {
  products: Product[];
  categories: string[];
  siteContent: SiteContent;
  whatsappNumber: string;
};

export default function Storefront({ products, categories, siteContent, whatsappNumber }: StorefrontProps) {
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  // Cart now stores entries keyed by "productId:variantId" (variantId optional)
  // Cart stores quantity keyed by "productId:variantId" (variantId optional)
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  // Color elegido en cada tarjeta: producto -> id de variante.
  const [chosenColor, setChosenColor] = useState<Record<number, number>>({});
  // Producto abierto en el detalle emergente (pop-up).
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  // Modal de precios y condiciones de venta por mayor
  const [wholesaleOpen, setWholesaleOpen] = useState(false);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesText = !text || `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(text);
      return matchesCategory && matchesText;
    });
  }, [category, query, products]);
  // Helper to build a cart key (productId:variantId) – variantId may be undefined
  const cartKey = (id: number, variantId?: number) => `${id}:${variantId ?? ''}`;

  // Build a flat list of cart entries from the composite cart map
  const cartEntries = Object.entries(cart).map(([key, quantity]) => {
    const [pidStr, vidStr] = key.split(":");
    const pid = Number(pidStr);
    const vid = vidStr ? Number(vidStr) : undefined;
    const product = products.find((p) => p.id === pid);
    return product ? { product, quantity, variantId: vid } : null;
  }).filter((e): e is { product: Product; quantity: number; variantId: number | undefined } => !!e);

  const cartCount = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartTotal = cartEntries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  function addToCart(id: number, variantId?: number) {
    // Resolve which variant id to use for the cart entry
    const resolvedVariantId =
      variantId !== undefined
        ? variantId
        : chosenColor[id] ??
          (products.find((p) => p.id === id)?.variants?.[0]?.id as number | undefined);

    setCart((current) => {
      const key = cartKey(id, resolvedVariantId);
      return { ...current, [key]: (current[key] ?? 0) + 1 };
    });

    // Update chosenColor state so UI shows the selected variant
    if (resolvedVariantId !== undefined) {
      setChosenColor((current) => ({ ...current, [id]: resolvedVariantId }));
    }

    setNotice("Producto agregado a tu bolsa");
    window.setTimeout(() => setNotice(""), 1800);
  }

  // Update quantity for a specific product+variant entry
  function updateQuantity(id: number, variantId: number | undefined, change: number) {
    const key = cartKey(id, variantId);
    setCart((current) => {
      const next = Math.max(0, (current[key] ?? 0) + change);
      const updated = { ...current };
      if (next === 0) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  }

  /** Mensaje de la cotizacion, tal como llegara al WhatsApp de la tienda. */
  const quoteMessage = useMemo(() => {
    const lines = cartEntries
      .map(({ product, quantity, variantId }) => {
        const variant = variantId !== undefined ? product.variants?.find(v => v.id === variantId) : undefined;
        const color = variant ? ` (color ${swatchLabel(variant)})` : "";
        const isPack = product.name.toLowerCase().includes("trend cake") || product.dozenPrice?.toLowerCase().includes("paquete");
        const packLabel = isPack ? " [Venta por paquete: 3 ovillos de 200g]" : "";
        return `• ${quantity} × ${product.name}${packLabel}${color} — ${money.format(product.price * quantity)}`;
      })
      .join("\n");
    return `Hola, quisiera cotizar:\n\n${lines}\n\nTotal referencial: ${money.format(cartTotal)}`;
  }, [cartEntries, cartTotal]);

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(quoteMessage)}`
    : "";

  /**
   * Deja copia de la cotizacion en la tienda. No bloquea la apertura de
   * WhatsApp: si el registro falla, el cliente igual envia su mensaje.
   */
  function recordQuote() {
    if (!cartEntries.length) return;

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartEntries.map(({ product, quantity, variantId }) => ({
          id: product.id,
          quantity,
          variantId: variantId ?? null,
        })),
      }),
      keepalive: true,
    }).catch(() => {
      // El registro es secundario; el canal real es WhatsApp.
    });

    setNotice("Abriendo WhatsApp con tu cotización…");
    window.setTimeout(() => setNotice(""), 3000);
  }

  /** Alternativa cuando no hay numero configurado o el cliente prefiere pegar. */
  async function copyQuote() {
    await navigator.clipboard.writeText(quoteMessage);
    recordQuote();
    setNotice("Cotización copiada. Pégala en WhatsApp para enviarla.");
    window.setTimeout(() => setNotice(""), 3000);
  }

  return (
    <main data-version={DEPLOY_VERSION}>
      <div className="shipping-bar" />

      <header className="site-header">
        <a className="brand brand-logo" href="#inicio" aria-label="Lanería El Siglo, inicio">
          <Image src="/logo-el-siglo.jpg" alt="Lanería El Siglo" width={1600} height={694} priority unoptimized />
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Abrir menú">
          <span />
          <span />
        </button>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"} aria-label="Navegación principal">
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Inicio</a>
          <a href="#catalogo" onClick={() => setMenuOpen(false)}>Catálogo</a>
          <a href="#nosotros" onClick={() => setMenuOpen(false)}>Nosotros</a>
          <button
            type="button"
            className="nav-link-btn"
            onClick={() => {
              setMenuOpen(false);
              setWholesaleOpen(true);
            }}
          >
            Mayoristas
          </button>
        </nav>
        <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Abrir bolsa, ${cartCount} productos`}>
          <span>Bolsa</span>
          <b>{cartCount}</b>
        </button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">{siteContent.heroEyebrow}</p>
          <h1>{siteContent.heroTitle}</h1>
          <p className="hero-text">{siteContent.heroText}</p>
          <div className="hero-cta-group">
            <a className="primary-button" href="#catalogo">{siteContent.heroCta}</a>
            <button
              type="button"
              className="hero-wholesale-btn"
              onClick={() => setWholesaleOpen(true)}
            >
              🏷️ Precio mayorista
            </button>
          </div>
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
            <h2>{siteContent.catalogTitle}</h2>
          </div>
          <Image src="/oren-bayan-logo.png" alt="Ören Bayan" className="catalog-brand-mark" width={998} height={1035} unoptimized />
          <p>{siteContent.catalogIntro}</p>
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
              <div
                className="product-image"
                onClick={() => setOpenProduct(product)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === "Enter" && setOpenProduct(product)}
                style={imageStyle(product, chosenColor[product.id])}
              >
                {index < 2 && <span className="product-badge">{index === 0 ? "Más vendido" : "Nuevo"}</span>}
                {(product.name.toLowerCase().includes("trend cake") || product.dozenPrice?.toLowerCase().includes("paquete")) && (
                  <span className="product-badge product-package-badge-card">📦 3 ovillos de 200g</span>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart(product.id);
                  }}
                  aria-label={`Agregar ${product.name} a la bolsa`}
                >
                  +
                </button>
              </div>
              <div
                className="product-info"
                role="button"
                tabIndex={0}
                onClick={() => setOpenProduct(product)}
                onKeyDown={(event) => event.key === "Enter" && setOpenProduct(product)}
              >
                <div>
                  <p>{product.category} · {product.weight}</p>
                  <h3>{product.name}</h3>
                  <span>{product.fiber}</span>
                </div>
                <div className="product-price">
                  <div className="product-price-main">
                    <strong>{product.price > 0 ? money.format(product.price) : "Consultar"}</strong>
                    <span>
                      {(product.name.toLowerCase().includes("trend cake") || product.dozenPrice?.toLowerCase().includes("paquete"))
                        ? "Venta x paquete"
                        : "Venta x mayor"}
                    </span>
                  </div>
                  {product.dozenPrice && <small>{product.dozenPrice}</small>}
                </div>
                {product.variants?.length ? (
                  <div className="product-card-color-strip" aria-label={`Colores de ${product.name}`}>
                    {product.variants.map((variant) => (
                      <button
                        aria-label={`Elegir color ${swatchLabel(variant)}`}
                        aria-pressed={chosenColor[product.id] === variant.id}
                        className={
                          chosenColor[product.id] === variant.id
                            ? "product-card-color-thumb product-card-color-thumb-active"
                            : "product-card-color-thumb"
                        }
                        key={variant.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setChosenColor((current) => ({ ...current, [product.id]: variant.id }));
                        }}
                        style={{ backgroundImage: `url("${variant.imageSource}")` }}
                        title={swatchLabel(variant)}
                        type="button"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <p className="empty-state">No encontramos lanas con ese criterio. Prueba con otro color o categoría.</p>}
      </section>

      <section className="promo-banners" aria-label="Colecciones destacadas">
        <article className="promo-banner promo-kit">
          <div className="promo-copy promo-copy-light">
            <p className="eyebrow">Todo comenzó hace más de 14 años.</p>
            <h2>{siteContent.bannerKitTitle}</h2>
            <p>{siteContent.bannerKitText}</p>
          </div>
        </article>
        <article className="promo-banner promo-colors">
          <div className="promo-copy promo-copy-dark">
            <p className="eyebrow">PALETA DE TEMPORADA</p>
            <h2>{siteContent.bannerColorsTitle}</h2>
            <p>{siteContent.bannerColorsText}</p>
            <a href="#catalogo">{siteContent.bannerColorsCta} <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </section>

      <section className="story-section" id="nosotros">
        <div className="story-card">
          <p className="eyebrow">HECHO PARA DISFRUTAR EL PROCESO</p>
          <h2>{siteContent.storyTitle}</h2>
          <p>{siteContent.storyText}</p>
        </div>
        <div className="benefits">
          <article><span>01</span><h3>Compra sencilla</h3><p>Explora por fibra o color y arma tu bolsa en pocos pasos.</p></article>
          <article><span>02</span><h3>Ayuda cercana</h3><p>Te orientamos para elegir la lana adecuada para tu proyecto.</p></article>
          <article><span>03</span><h3>Envíos a Chile</h3><p>Recibe tus materiales donde estés, con seguimiento.</p></article>
        </div>
      </section>

      <section className="faq-section">
        <div>
          <p className="eyebrow">PREGUNTAS FRECUENTES</p>
          <h2>{siteContent.faqQuestion}</h2>
        </div>
        <p>{siteContent.faqAnswer}</p>
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
          <Image src="/logo-el-siglo.jpg" alt="Lanería El Siglo" width={1600} height={694} unoptimized />
        </a>
        <div className="footer-locations" aria-label="Direcciones de locales">
          <strong>Locales y direcciones</strong>
          <address>
            <span>21 de mayo 675, Santiago Centro</span>
            <span>21 de mayo 657, Santiago Centro</span>
            <span>Monumento 1947, Maipú</span>
            <span>San Alfonso 51, Santiago</span>
          </address>
        </div>
        <div>
          <a href="#catalogo">Catálogo</a>
          <a href="#nosotros">Nosotros</a>
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => setWholesaleOpen(true)}
          >
            Mayoristas
          </button>
        </div>
        <small>© 2026 Lanería El Siglo</small>
      </footer>

      {cartOpen && <button className="drawer-overlay" onClick={() => setCartOpen(false)} aria-label="Cerrar bolsa" />}
      <aside className={cartOpen ? "cart-drawer cart-open" : "cart-drawer"} aria-hidden={!cartOpen} aria-label="Bolsa de compras">
        <div className="drawer-header">
          <div><p className="eyebrow">TU SELECCIÓN</p><h2>Bolsa ({cartCount})</h2></div>
          <button onClick={() => setCartOpen(false)} aria-label="Cerrar">×</button>
        </div>
        <div className="cart-content">
          {cartEntries.length === 0 ? (
            <div className="empty-cart"><span>○</span><h3>Tu bolsa está vacía</h3><p>Agrega algunas lanas para comenzar tu próximo proyecto.</p><button onClick={() => setCartOpen(false)}>Explorar catálogo</button></div>
          ) : (
            cartEntries.map((entry) => {
              const { product, quantity, variantId } = entry;
              const pickedVariant = variantId !== undefined ? product.variants?.find(v => v.id === variantId) : undefined;
              const key = `${product.id}:${variantId ?? ''}`;
              return (
                <article className="cart-item" key={key}>
                  <div
                    className="cart-thumb"
                    style={{
                      ...imageStyle(product, variantId ?? chosenColor[product.id]),
                    }}
                  />
                  <div>
                    <h3>{product.name}</h3>
                    <div>
                      <p>{product.category} · {product.weight}</p>
                      {pickedVariant && <p>Color: {swatchLabel(pickedVariant)}</p>}
                    </div>
                    <strong>{money.format(product.price)}</strong>
                    <div className="quantity">
                      <button onClick={() => updateQuantity(product.id, variantId, -1)} aria-label="Quitar uno">−</button>
                      <span>{quantity}</span>
                      <button onClick={() => updateQuantity(product.id, variantId, 1)} aria-label="Agregar uno">+</button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
        {cartEntries.length > 0 && (
          <div className="cart-summary">
            <div><span>Total referencial</span><strong>{money.format(cartTotal)}</strong></div>
            <p>Te confirmamos disponibilidad, despacho y forma de pago por WhatsApp.</p>
            {whatsappHref ? (
              <a
                className="whatsapp-button"
                href={whatsappHref}
                onClick={recordQuote}
                rel="noopener noreferrer"
                target="_blank"
              >
                Enviar cotización por WhatsApp
              </a>
            ) : (
              <button onClick={copyQuote} type="button">Copiar cotización para WhatsApp</button>
            )}
          </div>
        )}
      </aside>

      {notice && <div className="toast" role="status">{notice}</div>}

      {openProduct && (
        <ProductModal
          product={openProduct}
          chosenColor={chosenColor[openProduct.id]}
          onClose={() => setOpenProduct(null)}
          onAdd={(variantId) => {
            addToCart(openProduct.id, variantId);
            setOpenProduct(null);
          }}
          onPickColor={(variantId) =>
            setChosenColor((current) => ({ ...current, [openProduct.id]: variantId }))
          }
        />
      )}

      {wholesaleOpen && (
        <WholesaleModal onClose={() => setWholesaleOpen(false)} />
      )}
    </main>
  );
}

function ProductModal({
  product,
  chosenColor,
  onAdd,
  onClose,
  onPickColor,
}: {
  product: Product;
  chosenColor?: number;
  onAdd: (variantId?: number) => void;
  onClose: () => void;
  onPickColor: (variantId: number) => void;
}) {
  const activeVariant = product.variants?.find((item) => item.id === chosenColor);
  const colorCodes = (product.allColors || product.color || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  const colorLabel = activeVariant
    ? swatchLabel(activeVariant)
    : product.colorCount > 0
      ? `${product.colorCount} color(es)`
      : colorCodes.length
        ? `${colorCodes.length} color(es)`
        : "";

  return (
    <div className="product-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${product.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="product-modal-close" onClick={onClose} aria-label="Cerrar" type="button">
          ×
        </button>

        <div
          className="product-modal-image"
          style={imageStyle(product, chosenColor)}
          role="img"
          aria-label={product.name}
        />

        <div className="product-modal-body">
          <p className="product-modal-eyebrow">
            {product.category} · {product.weight}
          </p>
          <h2>{product.name}</h2>
          <span className="product-modal-fiber">{product.fiber}</span>

          {product.variants?.length ? (
            <div className="product-modal-color-section product-modal-color-section-top">
              <span className="product-swatch-label">
                Elige color{colorLabel ? `: ${colorLabel}` : ""}
              </span>
              <div className="product-modal-color-grid">
                {product.variants.map((variant) => (
                  <button
                    aria-label={`Elegir color ${swatchLabel(variant)}`}
                    aria-pressed={chosenColor === variant.id}
                    className={
                      chosenColor === variant.id
                        ? "product-color-thumb product-color-thumb-active"
                        : "product-color-thumb"
                    }
                    key={variant.id}
                    onClick={() => onPickColor(variant.id)}
                    style={{ backgroundImage: `url("${variant.imageSource}")` }}
                    title={swatchLabel(variant)}
                    type="button"
                  >
                    <span>{swatchLabel(variant)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : colorCodes.length ? (
            <div className="product-modal-color-section product-modal-color-section-top">
              <span className="product-swatch-label">
                Colores disponibles: {colorLabel}
              </span>
              <div className="product-color-code-row" aria-label={`Codigos de color de ${product.name}`}>
                {colorCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <small className="product-color-missing-note">
                Faltan fotos miniatura para estos colores. Cuando las cargues en el panel, aparecerán aquí como imágenes.
              </small>
            </div>
          ) : null}

          {product.description ? (
            <p className="product-modal-desc">{product.description}</p>
          ) : (
            <p className="product-modal-desc">
              {product.name}, de la categoría {product.category.toLowerCase()}. Disponible en{" "}
              {product.color}.
            </p>
          )}

          {(product.name.toLowerCase().includes("trend cake") || product.dozenPrice?.toLowerCase().includes("paquete")) && (
            <div className="product-package-box">
              <div className="product-package-header">
                <span className="product-package-icon">📦</span>
                <strong>Venta por Paquete</strong>
              </div>
              <p className="product-package-text">
                Cada paquete contiene <strong>3 ovillos de 200g</strong> (total 600g por paquete).
              </p>
              <p className="product-package-rule">
                🏷️ <strong>Venta mínima por mayor:</strong> 5 paquetes (colores a elección 🙌🏻).
              </p>
            </div>
          )}

          <dl className="product-modal-spec-line">
            <div><dt>Composición</dt><dd>{product.fiber || "—"}</dd></div>
            <div><dt>Gramaje</dt><dd>{product.weight}</dd></div>
            {product.length && <div><dt>Metraje</dt><dd>{product.length}</dd></div>}
            {product.needles && <div><dt>Palillo</dt><dd>{product.needles}</dd></div>}
            {product.crochet && <div><dt>Crochet</dt><dd>{product.crochet}</dd></div>}
          </dl>

          <div className="product-modal-footer">
            <div className="product-modal-price-line">
              <strong>{product.price > 0 ? money.format(product.price) : "Consultar"}</strong>
              <span>
                {(product.name.toLowerCase().includes("trend cake") || product.dozenPrice?.toLowerCase().includes("paquete"))
                  ? "Venta x paquete"
                  : "Venta x mayor"}
              </span>
            </div>
            {product.dozenPrice && <small>{product.dozenPrice}</small>}
            <button
              className="primary-button product-modal-add"
              onClick={() => onAdd(chosenColor)}
              type="button"
            >
              Agregar color elegido a la bolsa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WholesaleModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="product-modal-overlay wholesale-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="wholesale-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wholesale-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="wholesale-modal-close" onClick={onClose} aria-label="Cerrar" type="button">
          ×
        </button>

        <div className="wholesale-modal-header">
          <span className="wholesale-modal-badge">🧶 Venta por mayor</span>
          <h2 id="wholesale-modal-title">Precios y condiciones por mayor</h2>
        </div>

        <div className="wholesale-modal-body">
          <div className="wholesale-info-card">
            <div className="wholesale-card-icon">1</div>
            <div className="wholesale-card-text">
              <strong>Condición inicial de compra</strong>
              <p>
                Para venta por mayor, la condición inicial es de <strong>3 kg de un mismo artículo</strong>, y puedes elegir <strong>hasta 6 colores distintos</strong> dentro de esos 3 kg 🙌🏻
              </p>
            </div>
          </div>

          <div className="wholesale-info-card">
            <div className="wholesale-card-icon">2</div>
            <div className="wholesale-card-text">
              <strong>Combina tu pedido libremente</strong>
              <p>
                Una vez cumplido ese mínimo, puedes seguir agregando <strong>desde 1 kg</strong> del artículo o color que quieras, combinando tu pedido como prefieras 🧶✨
              </p>
            </div>
          </div>
        </div>

        <div className="wholesale-modal-footer">
          <a
            href="#catalogo"
            className="primary-button wholesale-cta-btn"
            onClick={onClose}
          >
            Ver catálogo
          </a>
          <button
            type="button"
            className="wholesale-close-btn"
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

