"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { categories as catalogCategories, products as catalogProducts, type Product } from "../catalog-data";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type AdminProduct = Product & {
  code: string;
  description: string;
  visible: boolean;
  brand: string;
  categories: string[];
};

type QuoteRequest = {
  address: string;
  detail: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  type: "Contacto" | "Cotización";
};

type SiteContent = {
  bannerKitCta: string;
  bannerKitText: string;
  bannerKitTitle: string;
  bannerColorsCta: string;
  bannerColorsText: string;
  bannerColorsTitle: string;
  catalogIntro: string;
  catalogTitle: string;
  faqAnswer: string;
  faqQuestion: string;
  heroCta: string;
  heroEyebrow: string;
  heroText: string;
  heroTitle: string;
  storyText: string;
  storyTitle: string;
};

type AdminSection =
  | "resumen"
  | "productos"
  | "categorias"
  | "marcas"
  | "contactos"
  | "cotizaciones"
  | "banners"
  | "medios"
  | "paginas"
  | "preguntas-frecuentes"
  | "reportes"
  | "administradores"
  | "roles-y-permisos"
  | "datos-del-sitio"
  | "seo";

const initialProducts: AdminProduct[] = catalogProducts.map((product) => ({
  ...product,
  code: product.allColors.split(",")[0]?.trim() || `LS-${String(product.id).padStart(3, "0")}`,
  description: `${product.name} ${product.weight}, ${product.fiber}. Disponible en ${product.color}.`,
  visible: true,
  brand: product.name.split(" ")[0] || "El Siglo",
  categories: [product.category],
}));

const initialCategories = catalogCategories.filter((category) => category !== "Todas");
const initialBrands = Array.from(new Set(initialProducts.map((product) => product.brand)));
const adminTokenStorageKey = "laneria-el-siglo-admin-token";

// La sesion del panel vive en sessionStorage. Se expone como store externo para
// leerla sin sincronizar estado dentro de un efecto.
const tokenListeners = new Set<() => void>();

function readToken() {
  return window.sessionStorage.getItem(adminTokenStorageKey) ?? "";
}

function writeToken(value: string) {
  if (value) window.sessionStorage.setItem(adminTokenStorageKey, value);
  else window.sessionStorage.removeItem(adminTokenStorageKey);
  tokenListeners.forEach((listener) => listener());
}

function subscribeToken(listener: () => void) {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

/** Fila tal como la entrega /api/products. */
type ProductRow = {
  id: number;
  name: string;
  category: string;
  color: string;
  fiber: string;
  weight: string;
  length: string;
  needles: string;
  crochet: string;
  price: number;
  dozen_price: string;
  image_source: string;
  image_position: string;
  image_size: string;
  color_count: number;
  all_colors: string;
  visible: number;
  description: string;
};

function toAdminProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    fiber: row.fiber,
    weight: row.weight,
    length: row.length,
    needles: row.needles,
    crochet: row.crochet,
    price: row.price,
    dozenPrice: row.dozen_price,
    imageSource: row.image_source,
    imagePosition: row.image_position,
    imageSize: row.image_size,
    colorCount: row.color_count,
    colorsWithPhoto: "",
    allColors: row.all_colors,
    code: row.all_colors.split(",")[0]?.trim() || `LS-${String(row.id).padStart(3, "0")}`,
    description: row.description,
    visible: row.visible === 1,
    brand: row.name.split(" ")[0] || "El Siglo",
    categories: [row.category],
  };
}

const defaultSiteContent: SiteContent = {
  bannerKitCta: "Explorar kits",
  bannerKitText: "Elige tus ovillos favoritos y encuentra los básicos para darle forma a tu próxima idea.",
  bannerKitTitle: "Arma tu primer kit de tejido",
  bannerColorsCta: "Ver colores",
  bannerColorsText: "Terracotas, verdes y rosas suaves para combinar sin complicaciones.",
  bannerColorsTitle: "Colores que se sienten tan bien como se ven",
  catalogIntro: "Listado actualizado desde la planilla: composición, gramaje, metraje, palillos, crochet y colores disponibles.",
  catalogTitle: "Catálogo de productos",
  faqAnswer: "Despachamos a todo Chile. Los tiempos y costos se confirman al cerrar la compra.",
  faqQuestion: "¿Realizan despachos?",
  heroCta: "Ver catálogo",
  heroEyebrow: "COLOR, TEXTURA Y CALIDEZ",
  heroText: "Encuentra fibras suaves, colores únicos y todo lo que necesitas para tu próximo proyecto.",
  heroTitle: "Lanas para crear a tu manera",
  storyText: "Seleccionamos fibras agradables al tacto, colores fáciles de combinar y formatos simples para que comprar sea tan entretenido como tejer.",
  storyTitle: "Tu próxima creación comienza con una buena lana",
};

const sidebarGroups: { title: string; items: { id: AdminSection; label: string }[] }[] = [
  { title: "Dashboard", items: [{ id: "resumen", label: "Resumen" }] },
  {
    title: "Productos",
    items: [
      { id: "productos", label: "Listado de productos" },
      { id: "categorias", label: "Categorías" },
      { id: "marcas", label: "Marcas" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { id: "contactos", label: "Contactos" },
      { id: "cotizaciones", label: "Cotizaciones" },
    ],
  },
  {
    title: "Contenido",
    items: [
      { id: "banners", label: "Banners" },
      { id: "medios", label: "Medios" },
      { id: "paginas", label: "Páginas" },
      { id: "preguntas-frecuentes", label: "Preguntas frecuentes" },
    ],
  },
  { title: "Reportes", items: [{ id: "reportes", label: "Ventas y solicitudes" }] },
  {
    title: "Usuarios",
    items: [
      { id: "administradores", label: "Administradores" },
      { id: "roles-y-permisos", label: "Roles y permisos" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { id: "datos-del-sitio", label: "Datos del sitio" },
      { id: "seo", label: "SEO" },
    ],
  },
];

const requests: QuoteRequest[] = [
  { address: "Av. Providencia 1245, Santiago", email: "maria.fuentes@email.cl", name: "Maria Fuentes", phone: "+56 9 8123 4567", type: "Cotización", detail: "12 ovillos Merino Gold 200 Lisa en tonos morado y blanco. Solicita despacho a domicilio.", status: "Pendiente" },
  { address: "Los Aromos 440, Ñuñoa", email: "taller@lastramas.cl", name: "Taller Las Tramas", phone: "+56 9 7234 8890", type: "Contacto", detail: "Consulta disponibilidad de colores baby para taller de tejido infantil.", status: "Nuevo" },
  { address: "Camino El Alba 9800, Las Condes", email: "carolina.vidal@email.cl", name: "Carolina Vidal", phone: "+56 9 6655 7711", type: "Cotización", detail: "Kit batik surtido: Sweet Baby, Tanja Batik y Favori Batik. Requiere precio por docena.", status: "En revisión" },
];

const contentItems = {
  banners: [
    { title: "Banner principal", area: "Inicio", status: "Activo" },
    { title: "Banner colores", area: "Catálogo", status: "Activo" },
  ],
  paginas: [
    { title: "Inicio", area: "Página principal", status: "Publicado" },
    { title: "Catálogo", area: "Listado de productos", status: "Publicado" },
    { title: "Nosotros", area: "Historia de la tienda", status: "Publicado" },
  ],
  faqs: [
    { title: "Despachos", area: "Preguntas frecuentes", status: "Borrador" },
    { title: "Cambios y devoluciones", area: "Preguntas frecuentes", status: "Borrador" },
  ],
};

const blankProduct = (categories: string[]): AdminProduct => ({
  id: Date.now(),
  name: "",
  category: categories[0] || "Lanas baby",
  color: "1 color",
  price: 0,
  weight: "100g",
  fiber: "",
  imageSource: "/productos-lanas.png",
  imagePosition: "center",
  imageSize: "cover",
  colorCount: 1,
  colorsWithPhoto: "",
  allColors: "",
  length: "",
  needles: "",
  crochet: "",
  dozenPrice: "",
  code: "",
  description: "",
  visible: true,
  brand: "El Siglo",
  categories: [categories[0] || "Lanas baby"],
});

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>("resumen");
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [brands, setBrands] = useState<string[]>(initialBrands);
  const [selectedProductId, setSelectedProductId] = useState<number>(initialProducts[0]?.id ?? 0);
  const [draftProduct, setDraftProduct] = useState<AdminProduct>(() => initialProducts[0] ?? blankProduct(initialCategories));
  const [newCategory, setNewCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [notice, setNotice] = useState("Cambios locales: conecta una base de datos para guardar en producción.");
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest>(requests[0]);
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [admins, setAdmins] = useState([
    { name: "Administrador principal", email: "admin@laneriaelsiglo.cl", role: "Administrador", permissions: "Catálogo, contenido, usuarios" },
    { name: "Editor catálogo", email: "catalogo@laneriaelsiglo.cl", role: "Editor", permissions: "Productos, categorías, marcas" },
    { name: "Vendedor", email: "ventas@laneriaelsiglo.cl", role: "Vendedor", permissions: "Solicitudes y cotizaciones" },
  ]);

  // La sesion se pierde al cerrar la pestana y solo viaja como cabecera Authorization.
  const token = useSyncExternalStore(subscribeToken, readToken, () => "");
  const [tokenDraft, setTokenDraft] = useState("");

  // Los textos y el catalogo son los que ve el publico: se leen de D1.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [contentResponse, productsResponse] = await Promise.all([
          fetch("/api/admin/content"),
          fetch("/api/products?limit=100"),
        ]);

        if (cancelled) return;

        if (contentResponse.ok) {
          const { content } = (await contentResponse.json()) as { content: Record<string, string> };
          setSiteContent({ ...defaultSiteContent, ...content });
        }

        if (productsResponse.ok) {
          const { data } = (await productsResponse.json()) as { data: ProductRow[] };
          if (data?.length) {
            const mapped = data.map(toAdminProduct);
            setProducts(mapped);
            setCategories(Array.from(new Set(mapped.map((product) => product.category))));
            setSelectedProductId(mapped[0].id);
            setDraftProduct(mapped[0]);
          }
        }
      } catch {
        if (!cancelled) setNotice("No se pudo cargar el contenido desde la base de datos.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    writeToken("");
    setNotice("Sesión cerrada.");
  }

  /** Envuelve las escrituras: adjunta el token y traduce los errores comunes. */
  async function authedFetch(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      signOut();
      throw new Error(
        "Tu sesión terminó (se pierde al cerrar la pestaña). Vuelve a ingresar la contraseña del panel."
      );
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Error ${response.status}`);
    }

    return response;
  }

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const visibleCount = products.filter((product) => product.visible).length;
  const pricedProducts = products.filter((product) => product.price > 0);
  const averagePrice = Math.round(pricedProducts.reduce((sum, product) => sum + product.price, 0) / Math.max(pricedProducts.length, 1));

  const productsByCategory = useMemo(
    () => categories.map((category) => ({ category, total: products.filter((product) => product.categories.includes(category)).length })),
    [categories, products],
  );
  const maxCategoryTotal = Math.max(...productsByCategory.map((group) => group.total), 1);
  const dashboardTrend = [
    { label: "Lun", value: 6 },
    { label: "Mar", value: 11 },
    { label: "Mié", value: 8 },
    { label: "Jue", value: 15 },
    { label: "Vie", value: requests.length + visibleCount },
  ];
  const maxTrend = Math.max(...dashboardTrend.map((item) => item.value), 1);

  function openProduct(product: AdminProduct) {
    setSelectedProductId(product.id);
    setDraftProduct({ ...product });
    setActiveSection("productos");
  }

  async function saveProduct() {
    const normalizedProduct = {
      ...draftProduct,
      category: draftProduct.categories[0] || draftProduct.category,
    };

    try {
      await authedFetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          category: normalizedProduct.category,
          price: normalizedProduct.price,
          description: normalizedProduct.description,
          visible: normalizedProduct.visible,
          image_source: normalizedProduct.imageSource,
        }),
      });

      setProducts((current) =>
        current.map((product) => (product.id === normalizedProduct.id ? normalizedProduct : product)),
      );
      setSelectedProductId(normalizedProduct.id);
      setNotice(`"${normalizedProduct.name}" guardado. Ya está actualizado en la tienda.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    }
  }

  function addCategory() {
    const value = newCategory.trim();
    if (!value || categories.includes(value)) return;
    setCategories((current) => [...current, value]);
    setNewCategory("");
  }

  function removeCategory(category: string) {
    setCategories((current) => current.filter((item) => item !== category));
  }

  function addBrand() {
    const value = newBrand.trim();
    if (!value || brands.includes(value)) return;
    setBrands((current) => [...current, value]);
    setNewBrand("");
  }

  function removeBrand(brand: string) {
    setBrands((current) => current.filter((item) => item !== brand));
  }

  async function saveSiteContent(nextContent: SiteContent) {
    try {
      await authedFetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextContent),
      });
      setSiteContent(nextContent);
      setNotice("Contenido publicado. Ya está visible en la tienda.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el contenido.");
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          Lanería El Siglo
        </Link>
        <nav aria-label="Panel administrativo">
          {sidebarGroups.map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map((item) => (
                <button
                  className={activeSection === item.id ? "admin-nav-active" : ""}
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Panel administrativo</p>
            <h1>Gestión de tienda</h1>
          </div>
          <div className="admin-topbar-actions">
            {token ? (
              <button className="admin-session-out" onClick={signOut} type="button">Cerrar sesión</button>
            ) : null}
            <Link href="/">Ver tienda</Link>
          </div>
        </header>

        {!token && (
          <form
            className="admin-gate"
            onSubmit={(event) => {
              event.preventDefault();
              const value = tokenDraft.trim();
              if (!value) return;
              writeToken(value);
              setTokenDraft("");
              setNotice("Sesión iniciada. Ya puedes guardar cambios.");
            }}
          >
            <div>
              <strong>Modo lectura</strong>
              <p>Ingresa la contraseña del panel para guardar cambios en la tienda.</p>
            </div>
            <label>
              <span className="admin-gate-label">Contraseña del panel</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder="Contraseña"
                type="password"
                value={tokenDraft}
              />
            </label>
            <button type="submit">Entrar</button>
          </form>
        )}

        {notice && <div className="admin-notice">{notice}</div>}

        {activeSection === "resumen" && (
          <>
            <section className="admin-stats">
              <article><span>Productos</span><strong>{products.length}</strong><p>Entradas cargadas por categoría</p></article>
              <article><span>Visibles</span><strong>{visibleCount}</strong><p>Productos publicados en catálogo</p></article>
              <article><span>Categorías</span><strong>{categories.length}</strong><p>Familias principales de lanas</p></article>
              <article><span>Precio promedio</span><strong>{money.format(averagePrice)}</strong><p>Calculado sobre productos con precio</p></article>
            </section>

            <section className="admin-grid">
              <article className="admin-panel">
                <div className="admin-panel-heading"><div><p>Productos</p><h2>Listado de productos</h2></div><button onClick={() => setActiveSection("productos")} type="button">Entrar</button></div>
                <div className="admin-table">
                  {products.map((product) => (
                    <button className="admin-row admin-row-button" key={product.id} onClick={() => openProduct(product)} type="button">
                      <ProductThumb product={product} />
                      <div><strong>{product.name}</strong><small>{product.categories.join(", ")} / {product.code}</small></div>
                      <b>{product.price > 0 ? money.format(product.price) : "Consultar"}</b>
                      <em>{product.visible ? "Visible" : "Oculto"}</em>
                    </button>
                  ))}
                </div>
              </article>

              <article className="admin-panel">
                <div className="admin-panel-heading"><div><p>Catálogo</p><h2>Categorías</h2></div><button onClick={() => setActiveSection("categorias")} type="button">Entrar</button></div>
                <div className="admin-category-list">
                  {productsByCategory.map((group) => (
                    <div key={group.category}><strong>{group.category}</strong><span>{group.total} productos</span><small>Editable</small></div>
                  ))}
                </div>
              </article>
            </section>

            <section className="admin-dashboard-charts">
              <article className="admin-panel admin-chart-panel">
                <div className="admin-panel-heading"><div><p>Visibilidad</p><h2>Estado del catálogo</h2></div></div>
                <div className="admin-meter-grid">
                  <div>
                    <span>Productos visibles</span>
                    <strong>{visibleCount}/{products.length}</strong>
                    <div className="admin-meter"><i style={{ width: `${Math.round((visibleCount / Math.max(products.length, 1)) * 100)}%` }} /></div>
                  </div>
                  <div>
                    <span>Con precio definido</span>
                    <strong>{pricedProducts.length}/{products.length}</strong>
                    <div className="admin-meter admin-meter-alt"><i style={{ width: `${Math.round((pricedProducts.length / Math.max(products.length, 1)) * 100)}%` }} /></div>
                  </div>
                </div>
              </article>

              <article className="admin-panel admin-chart-panel">
                <div className="admin-panel-heading"><div><p>Categorías</p><h2>Productos por categoría</h2></div></div>
                <div className="admin-bar-chart">
                  {productsByCategory.map((group) => (
                    <div key={group.category}>
                      <span>{group.category}</span>
                      <div><i style={{ width: `${Math.round((group.total / maxCategoryTotal) * 100)}%` }} /></div>
                      <strong>{group.total}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="admin-panel admin-chart-panel">
                <div className="admin-panel-heading"><div><p>Actividad</p><h2>Solicitudes recientes</h2></div></div>
                <div className="admin-line-chart">
                  {dashboardTrend.map((item) => (
                    <div key={item.label} style={{ height: `${Math.max(18, Math.round((item.value / maxTrend) * 100))}%` }}>
                      <i />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}

        {activeSection === "productos" && (
          <section className="admin-grid admin-products-layout">
            <article className="admin-panel admin-products-list">
              <div className="admin-panel-heading">
                <div><p>Productos</p><h2>Listado de productos</h2></div>
                <span className="admin-panel-count">{products.length} productos</span>
              </div>
              <div className="admin-table">
                {products.map((product) => (
                  <button className={selectedProductId === product.id ? "admin-row admin-row-button admin-row-selected" : "admin-row admin-row-button"} key={product.id} onClick={() => openProduct(product)} type="button">
                    <ProductThumb product={product} />
                    <div><strong>{product.name}</strong><small>{product.categories.join(", ")} / {product.code}</small></div>
                    <b>{product.price > 0 ? money.format(product.price) : "Consultar"}</b>
                    <em>{product.visible ? "Visible" : "Oculto"}</em>
                  </button>
                ))}
              </div>
            </article>

            <ProductEditor
              authedFetch={authedFetch}
              brands={brands}
              canWrite={Boolean(token)}
              categories={categories}
              product={draftProduct}
              setNotice={setNotice}
              setProduct={setDraftProduct}
              onSave={saveProduct}
              title={selectedProduct ? `Ficha: ${selectedProduct.name}` : "Ficha de producto"}
            />
          </section>
        )}

        {activeSection === "categorias" && (
          <ManageListPanel
            intro="Crea, edita o elimina categorías visibles en el catálogo."
            items={categories}
            label="Categoría"
            newValue={newCategory}
            onAdd={addCategory}
            onChange={setNewCategory}
            onRemove={removeCategory}
            title="Categorías"
          />
        )}

        {activeSection === "marcas" && (
          <ManageListPanel
            intro="Administra las marcas que luego se asignan en la ficha del producto."
            items={brands}
            label="Marca"
            newValue={newBrand}
            onAdd={addBrand}
            onChange={setNewBrand}
            onRemove={removeBrand}
            title="Marcas"
          />
        )}

        {activeSection === "cotizaciones" && <OrdersPanel authedFetch={authedFetch} canWrite={Boolean(token)} />}

        {activeSection === "contactos" && (
          <section className="admin-grid admin-request-layout">
            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p>Solicitudes</p><h2>Contactos</h2></div></div>
              <div className="admin-request-list">
                {requests.filter((request) => request.type === "Contacto").map((request) => (
                  <button className={selectedRequest.name === request.name ? "admin-request-card admin-request-selected" : "admin-request-card"} key={`${request.name}-${request.type}`} onClick={() => setSelectedRequest(request)} type="button">
                    <span>{request.type}</span><strong>{request.name}</strong><p>{request.detail}</p><em>{request.status}</em>
                  </button>
                ))}
              </div>
            </article>

            <article className="admin-panel">
              <div className="admin-panel-heading"><div><p>Detalle interno</p><h2>{selectedRequest.type}</h2></div><button type="button">Cambiar estado</button></div>
              <div className="admin-detail-card">
                <div><span>Nombre</span><strong>{selectedRequest.name}</strong></div>
                <div><span>Correo</span><strong>{selectedRequest.email}</strong></div>
                <div><span>Teléfono</span><strong>{selectedRequest.phone}</strong></div>
                <div><span>Dirección</span><strong>{selectedRequest.address}</strong></div>
                <div className="admin-detail-full"><span>Detalle de lo cotizado</span><p>{selectedRequest.detail}</p></div>
              </div>
            </article>
          </section>
        )}

        {(activeSection === "banners" || activeSection === "paginas" || activeSection === "preguntas-frecuentes") && (
          <ContentPanel activeSection={activeSection} content={siteContent} onSave={saveSiteContent} />
        )}

        {activeSection === "medios" && <MediaPanel authedFetch={authedFetch} canWrite={Boolean(token)} setNotice={setNotice} />}

        {activeSection === "reportes" && <SimplePanel title="Reportes" intro="Resumen de ventas, solicitudes y productos visibles. La conexión a métricas reales queda pendiente." items={["Productos visibles", "Solicitudes abiertas", "Cotizaciones pendientes"]} />}
        {activeSection === "administradores" && <UsersPanel admins={admins} setAdmins={setAdmins} />}
        {activeSection === "roles-y-permisos" && <SimplePanel title="Roles y permisos" intro="Define permisos para productos, contenido, reportes y solicitudes." items={["Administrador: catálogo, contenido, usuarios y configuración", "Editor: productos, categorías, marcas, banners y páginas", "Vendedor: contactos, cotizaciones y reportes"]} />}
        {activeSection === "datos-del-sitio" && <SimplePanel title="Datos del sitio" intro="Edita datos generales: nombre, correo, teléfono, WhatsApp, dirección y horario." items={["Lanería El Siglo", "Despacho a todo Chile", "Horario pendiente"]} />}
        {activeSection === "seo" && <SimplePanel title="SEO" intro="Edita título, descripción, imagen social y palabras clave por página." items={["Título principal", "Descripción del catálogo", "Imagen OG"]} />}
      </section>
    </main>
  );
}

function ProductThumb({ product }: { product: AdminProduct }) {
  return (
    <span
      className="admin-thumb"
      style={{
        backgroundImage: `url("${product.imageSource}")`,
        backgroundPosition: product.imagePosition,
        backgroundSize: product.imageSize,
      }}
    />
  );
}

type Variant = {
  id: number;
  product_id: number;
  code: string;
  color_name: string;
  image_source: string;
  sort_order: number;
};

/**
 * A que escribe el selector de imagenes: la foto principal, un color concreto
 * o una tanda de colores nuevos (seleccion multiple).
 */
type ImageTarget =
  | { kind: "product" }
  | { kind: "variant"; id: number; code: string }
  | { kind: "bulk" };

function ProductEditor({
  authedFetch,
  brands,
  canWrite,
  categories,
  onSave,
  product,
  setNotice,
  setProduct,
  title,
}: {
  authedFetch: (url: string, init: RequestInit) => Promise<Response>;
  brands: string[];
  canWrite: boolean;
  categories: string[];
  onSave: () => void;
  product: AdminProduct;
  setNotice: (message: string) => void;
  setProduct: (product: AdminProduct) => void;
  title: string;
}) {
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [mediaList, setMediaList] = useState<Array<{ id: number; filename: string; url: string }>>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [modalTab, setModalTab] = useState<"medios" | "subir">("medios");
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsBusy, setVariantsBusy] = useState(false);
  // Fotos marcadas en el modo "agregar varias".
  const [picked, setPicked] = useState<string[]>([]);

  // Las variantes viven en su propia tabla, asi que se recargan al cambiar de ficha.
  useEffect(() => {
    let cancelled = false;

    async function loadVariants() {
      try {
        const response = await fetch(`/api/admin/variants?product_id=${product.id}`);
        if (!response.ok) return;
        const { variants: rows } = (await response.json()) as { variants: Variant[] };
        if (!cancelled) setVariants(rows ?? []);
      } catch {
        if (!cancelled) setVariants([]);
      }
    }

    loadVariants();
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    if (!imageTarget) return;
    let cancelled = false;

    async function loadMedia() {
      try {
        setMediaLoading(true);
        const response = await fetch("/api/admin/media");
        const { media } = (await response.json()) as { media: { id: number; filename: string; url: string }[] };
        if (!cancelled) setMediaList(media ?? []);
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    }

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [imageTarget]);

  const declaredCodes = product.allColors.split(",").map((code) => code.trim()).filter(Boolean);

  /** Crea una variante por cada codigo del campo "Colores / codigos". */
  async function seedVariants() {
    const codes = declaredCodes;
    if (!codes.length) {
      setNotice("Escribe los códigos en \"Colores / códigos\" antes de generarlos.");
      return;
    }

    setVariantsBusy(true);
    try {
      const response = await authedFetch("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, codes }),
      });
      const { variants: rows } = (await response.json()) as { variants: Variant[] };
      setVariants(rows ?? []);
      setNotice(`${rows.length} código(s) disponibles para ${product.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron generar los códigos.");
    } finally {
      setVariantsBusy(false);
    }
  }

  /** Guarda un campo de la variante. Se persiste al vuelo, sin "Guardar cambios". */
  async function patchVariant(id: number, patch: Partial<Pick<Variant, "code" | "color_name" | "image_source">>) {
    setVariants((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    try {
      await authedFetch("/api/admin/variants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el color.");
    }
  }

  async function removeVariant(variant: Variant) {
    if (!window.confirm(`¿Eliminar el código "${variant.code}"?`)) return;
    setVariants((current) => current.filter((item) => item.id !== variant.id));
    try {
      await authedFetch(`/api/admin/variants?id=${variant.id}`, { method: "DELETE" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar el código.");
    }
  }

  /** Agrega de una vez todas las fotos marcadas como colores del producto. */
  async function addPickedImages() {
    if (!picked.length) return;

    setVariantsBusy(true);
    try {
      const response = await authedFetch("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          images: picked,
          available_codes: declaredCodes,
        }),
      });
      const { variants: rows } = (await response.json()) as { variants: Variant[] };
      setVariants(rows ?? []);
      setNotice(`${picked.length} foto(s) agregadas a ${product.name}. Ajusta el código y el nombre de cada color.`);
      setPicked([]);
      setImageTarget(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron agregar las fotos.");
    } finally {
      setVariantsBusy(false);
    }
  }

  /** Aplica la imagen elegida al destino que abrio el selector. */
  function applyImage(url: string) {
    if (!imageTarget) return;

    if (imageTarget.kind === "bulk") {
      setPicked((current) =>
        current.includes(url) ? current.filter((item) => item !== url) : [...current, url]
      );
      return;
    }

    if (imageTarget.kind === "product") {
      setProduct({ ...product, imageSource: url });
      setNotice("Imagen principal actualizada. Pulsa \"Guardar cambios\" para publicarla.");
    } else {
      patchVariant(imageTarget.id, { image_source: url });
      setNotice(`Imagen asignada al código ${imageTarget.code}.`);
    }

    setImageTarget(null);
  }

  async function uploadAndApply(files: FileList | null) {
    if (!files?.length) return;

    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await authedFetch("/api/admin/media", { method: "POST", body: form });
      const { uploaded } = (await response.json()) as { uploaded: { url: string }[] };

      if (!uploaded?.length) {
        setNotice("No se subió ninguna imagen.");
        return;
      }

      // En modo "agregar varias" se marcan todas las recién subidas.
      if (imageTarget?.kind === "bulk") {
        setPicked((current) => [...current, ...uploaded.map((item) => item.url)]);
        setModalTab("medios");
        setNotice(`${uploaded.length} foto(s) subidas y marcadas.`);
        return;
      }

      applyImage(uploaded[0].url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  const visibleMedia = mediaList.filter((media) =>
    media.filename.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  return (
    <>
      <div className="admin-editor-column">
      <article className="admin-panel admin-editor">
        <div className="admin-panel-heading"><div><p>Ficha editable</p><h2>{title}</h2></div><button onClick={onSave} type="button">Guardar cambios</button></div>
        <div className="admin-editor-content">
          <div className="admin-editor-image">
            <div className="admin-image-display">
              {product.imageSource ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img alt={product.name} src={product.imageSource} />
              ) : (
                <div className="admin-image-empty">Sin imagen</div>
              )}
            </div>
            <button type="button" onClick={() => setImageTarget({ kind: "product" })} className="admin-image-picker-btn-large">
              {product.imageSource ? "Cambiar imagen" : "Seleccionar imagen"}
            </button>
          </div>
          <div className="admin-editor-form">
            <div className="admin-form-row">
              <label><span>Nombre del producto</span><input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} /></label>
              <label><span>Código</span><input value={product.code} onChange={(event) => setProduct({ ...product, code: event.target.value })} /></label>
            </div>
            <div className="admin-form-row">
              <label><span>Precio</span><input min="0" type="number" value={product.price} onChange={(event) => setProduct({ ...product, price: Number(event.target.value) })} /></label>
              <label><span>Precio docena</span><input value={product.dozenPrice} onChange={(event) => setProduct({ ...product, dozenPrice: event.target.value })} /></label>
            </div>
            <div className="admin-form-full">
              <span className="admin-field-label">Categorías</span>
              <div className="admin-checkbox-grid">
                {categories.map((category) => {
                  const checked = product.categories.includes(category);
                  return (
                    <label key={category}>
                      <input checked={checked} type="checkbox" onChange={(event) => {
                        const nextCategories = event.target.checked ? [...product.categories, category] : product.categories.filter((item) => item !== category);
                        setProduct({ ...product, categories: nextCategories, category: nextCategories[0] || product.category });
                      }} />
                      <span>{category}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="admin-form-row">
              <label><span>Marca</span><select value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })}>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
            </div>
            <div className="admin-form-row">
              <label><span>Composición</span><input value={product.fiber} onChange={(event) => setProduct({ ...product, fiber: event.target.value })} /></label>
              <label><span>Gramaje</span><input value={product.weight} onChange={(event) => setProduct({ ...product, weight: event.target.value })} /></label>
            </div>
            <label className="admin-form-full"><span>Colores / códigos</span><input value={product.allColors} onChange={(event) => setProduct({ ...product, allColors: event.target.value })} /></label>
            <label className="admin-form-full"><span>Descripción</span><textarea value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} /></label>
            <label className="admin-switch"><input checked={product.visible} type="checkbox" onChange={(event) => setProduct({ ...product, visible: event.target.checked })} /><span>Visible en la tienda</span></label>
          </div>
        </div>
      </article>

      <section className="admin-panel admin-variants">
          <div className="admin-variants-heading">
            <div>
              <span className="admin-field-label">Más fotos de este producto</span>
              <p>
                Un producto puede tener varias fotos: una por color. En la tienda salen como
                círculos bajo la ficha y al pulsarlos cambia la imagen. Se guardan al momento,
                sin pasar por &quot;Guardar cambios&quot;.
              </p>
            </div>
            <div className="admin-variants-actions">
              <button
                type="button"
                onClick={() => {
                  setPicked([]);
                  setModalTab("medios");
                  setImageTarget({ kind: "bulk" });
                }}
                disabled={!canWrite || variantsBusy}
              >
                Agregar fotos
              </button>
              <button
                className="admin-variants-secondary"
                type="button"
                onClick={seedVariants}
                disabled={!canWrite || variantsBusy}
              >
                {variantsBusy ? "Trabajando…" : "Generar desde códigos"}
              </button>
            </div>
          </div>

          {!canWrite && (
            <p className="admin-variants-locked">
              Ingresa la contraseña del panel (arriba, en <strong>Modo lectura</strong>) para editar los colores.
            </p>
          )}

          {variants.length === 0 ? (
            <p className="admin-variants-empty">
              Todavía no hay colores. <strong>Agregar fotos</strong> te deja marcar varias imágenes
              de la biblioteca y crea un color por cada una. <strong>Generar desde códigos</strong>
              crea uno por cada valor del campo <em>Colores / códigos</em>, para que luego les
              asignes la foto.
            </p>
          ) : (
            <div className="admin-variant-grid">
              <datalist id={`codigos-${product.id}`}>
                {declaredCodes.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              {variants.map((variant) => (
                <div className="admin-variant-card" key={variant.id}>
                  <button
                    className="admin-variant-image"
                    disabled={!canWrite}
                    type="button"
                    onClick={() => {
                      setModalTab("medios");
                      setImageTarget({ kind: "variant", id: variant.id, code: variant.code });
                    }}
                    title={canWrite ? "Elegir imagen para este código" : "Inicia sesión para cambiar la foto"}
                  >
                    {variant.image_source ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img alt={variant.code} src={variant.image_source} />
                    ) : (
                      <span>Sin foto</span>
                    )}
                  </button>
                  <input
                    aria-label={`Código ${variant.code}`}
                    className="admin-variant-code"
                    list={`codigos-${product.id}`}
                    defaultValue={variant.code}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next && next !== variant.code) patchVariant(variant.id, { code: next });
                    }}
                  />
                  <input
                    aria-label={`Nombre del color ${variant.code}`}
                    className="admin-variant-color"
                    defaultValue={variant.color_name}
                    placeholder="Nombre del color"
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next !== variant.color_name) patchVariant(variant.id, { color_name: next });
                    }}
                  />
                  <button className="admin-variant-remove" type="button" onClick={() => removeVariant(variant)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
      </section>
      </div>

      {imageTarget && (
        <div className="admin-modal-overlay" onClick={() => setImageTarget(null)}>
          <div className="admin-modal admin-modal-large" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>
                {imageTarget.kind === "product"
                  ? `Imagen principal de ${product.name}`
                  : imageTarget.kind === "bulk"
                    ? `Agregar colores a ${product.name}`
                    : `Imagen del código ${imageTarget.code}`}
              </h2>
              <button className="admin-modal-close" onClick={() => setImageTarget(null)} aria-label="Cerrar">×</button>
            </div>

            <div className="admin-modal-body-large">
              <div className="admin-modal-tabs">
                <button
                  className={modalTab === "medios" ? "admin-tab-active" : ""}
                  onClick={() => setModalTab("medios")}
                  type="button"
                >
                  Medios cargados
                </button>
                <button
                  className={modalTab === "subir" ? "admin-tab-active" : ""}
                  onClick={() => setModalTab("subir")}
                  type="button"
                >
                  Cargar nueva
                </button>
              </div>

              {modalTab === "subir" ? (
                <label className="admin-dropzone">
                  <input
                    accept="image/*"
                    multiple
                    disabled={uploading || !canWrite}
                    onChange={(event) => {
                      uploadAndApply(event.target.files);
                      event.target.value = "";
                    }}
                    type="file"
                  />
                  <strong>{uploading ? "Subiendo…" : "Haz clic para elegir una imagen"}</strong>
                  <small>Se sube a la biblioteca y queda asignada de inmediato</small>
                </label>
              ) : mediaLoading ? (
                <p className="admin-media-empty">Cargando biblioteca…</p>
              ) : (
                <>
                  <input
                    aria-label="Buscar imagen"
                    className="admin-media-search"
                    onChange={(event) => setMediaSearch(event.target.value)}
                    placeholder="Buscar por nombre (ej: 'Favori', 'IMG')"
                    type="text"
                    value={mediaSearch}
                  />
                  {imageTarget.kind === "bulk" && (
                    <p className="admin-modal-hint">
                      Marca todas las fotos que quieras. Cada una se convierte en un color del
                      producto; después les pones el código y el nombre.
                    </p>
                  )}
                  <div className="admin-media-grid-modal">
                    {visibleMedia.map((media) => {
                      const marked = picked.includes(media.url);
                      return (
                        <button
                          aria-pressed={imageTarget.kind === "bulk" ? marked : undefined}
                          className={marked ? "admin-media-card-modal admin-media-card-picked" : "admin-media-card-modal"}
                          key={media.id}
                          onClick={() => applyImage(media.url)}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={media.filename} loading="lazy" src={media.url} />
                          <small>{media.filename}</small>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {imageTarget.kind === "bulk" && (
                <div className="admin-modal-footer">
                  <span>{picked.length} foto(s) marcadas</span>
                  <button disabled={!picked.length || variantsBusy} onClick={addPickedImages} type="button">
                    {variantsBusy ? "Agregando…" : `Agregar ${picked.length || ""} color(es)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ManageListPanel({
  intro,
  items,
  label,
  newValue,
  onAdd,
  onChange,
  onRemove,
  title,
}: {
  intro: string;
  items: string[];
  label: string;
  newValue: string;
  onAdd: () => void;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  title: string;
}) {


  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><p>Catálogo</p><h2>{title}</h2></div></div>
      <p className="admin-panel-intro">{intro}</p>
      <div className="admin-inline-form">
        <label><span>Nueva {label.toLowerCase()}</span><input value={newValue} onChange={(event) => onChange(event.target.value)} placeholder={`Nueva ${label.toLowerCase()}`} /></label>
        <button onClick={onAdd} type="button">Agregar</button>
      </div>
      <div className="admin-edit-list">
        {items.map((item) => (
          <div key={item}><input defaultValue={item} aria-label={`Editar ${item}`} /><button onClick={() => onRemove(item)} type="button">Eliminar</button></div>
        ))}
      </div>
    </section>
  );
}

type OrderRow = {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  total: number;
  status: string;
  shipping_address: string;
  notes: string;
  created_at: string;
  lines: number;
  detail: string | null;
};

function OrdersPanel({
  authedFetch,
  canWrite,
}: {
  authedFetch: (url: string, init: RequestInit) => Promise<Response>;
  canWrite: boolean;
}) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await authedFetch("/api/orders", { method: "GET" });
        const { orders: rows } = (await response.json()) as { orders: OrderRow[] };
        if (!cancelled) {
          setOrders(rows ?? []);
          setState("idle");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "No se pudieron cargar las cotizaciones.");
          setState("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, canWrite]);

  if (!canWrite) {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p>Solicitudes</p><h2>Cotizaciones</h2></div></div>
        <p className="admin-media-empty">Ingresa la contraseña del panel para ver las cotizaciones.</p>
      </section>
    );
  }



  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><p>Solicitudes</p><h2>Cotizaciones</h2></div>
        <span className="admin-panel-count">{orders.length} cotización(es)</span>
      </div>

      {state === "error" ? (
        <p className="admin-media-empty">{message}</p>
      ) : orders.length === 0 ? (
        <p className="admin-media-empty">Todavía no hay cotizaciones.</p>
      ) : (
        <div className="admin-orders">
          {orders.map((order) => (
            <article className="admin-order" key={order.id}>
              <header>
                <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                <span className="admin-order-status">{order.status}</span>
                <b>{money.format(order.total)}</b>
              </header>
              <p className="admin-order-detail">{order.detail ?? `${order.lines} línea(s)`}</p>
              <dl className="admin-order-meta">
                <div><dt>Cliente</dt><dd>{order.user_name}</dd></div>
                <div><dt>Correo</dt><dd>{order.user_email}</dd></div>
                {order.user_phone && <div><dt>Teléfono</dt><dd>{order.user_phone}</dd></div>}
                <div><dt>Despacho</dt><dd>{order.shipping_address}</dd></div>
                <div><dt>Fecha</dt><dd>{order.created_at}</dd></div>
                {order.notes && <div><dt>Comentarios</dt><dd>{order.notes}</dd></div>}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type MediaItem = {
  id: number;
  kv_key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
  url: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function MediaPanel({
  authedFetch,
  canWrite,
  setNotice,
}: {
  authedFetch: (url: string, init: RequestInit) => Promise<Response>;
  canWrite: boolean;
  setNotice: (message: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/admin/media");
      const { media } = (await response.json()) as { media: MediaItem[] };
      setItems(media ?? []);
    } catch {
      setNotice("No se pudo cargar la biblioteca de medios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/media");
        const { media } = (await response.json()) as { media: MediaItem[] };
        if (!cancelled) setItems(media ?? []);
      } catch {
        if (!cancelled) setNotice("No se pudo cargar la biblioteca de medios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setNotice]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    if (!canWrite) {
      setNotice("Ingresa la contraseña del panel para subir imágenes.");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      list.forEach((file) => form.append("files", file));

      const response = await authedFetch("/api/admin/media", { method: "POST", body: form });
      const result = (await response.json()) as {
        uploaded: MediaItem[];
        rejected: { filename: string; reason: string }[];
      };

      await refresh();

      const parts: string[] = [];
      if (result.uploaded.length) parts.push(`${result.uploaded.length} imagen(es) subida(s)`);
      if (result.rejected.length) {
        parts.push(result.rejected.map((item) => `${item.filename}: ${item.reason}`).join(" · "));
      }
      setNotice(parts.join(". "));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron subir las imágenes.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: MediaItem) {
    if (!canWrite) {
      setNotice("Ingresa la contraseña del panel para eliminar imágenes.");
      return;
    }
    if (!window.confirm(`¿Eliminar "${item.filename}"? Las fichas que la usen quedarán sin imagen.`)) return;

    try {
      await authedFetch(`/api/admin/media?key=${encodeURIComponent(item.kv_key)}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.kv_key !== item.kv_key));
      setNotice(`"${item.filename}" eliminada.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar la imagen.");
    }
  }

  async function copyUrl(item: MediaItem) {
    await navigator.clipboard.writeText(item.url);
    setNotice(`Ruta copiada: ${item.url} — pégala en "Imagen" de la ficha de producto.`);
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p>Contenido dinámico</p>
          <h2>Medios</h2>
        </div>
        <span className="admin-panel-count">{items.length} archivo(s)</span>
      </div>

      <p className="admin-media-intro">
        Sube varias imágenes a la vez. Formatos: JPG, PNG, WebP, GIF, AVIF y SVG, hasta 10 MB cada una.
        Copia la ruta de una imagen y pégala en el campo &quot;Imagen&quot; de la ficha de producto.
      </p>

      {items.length > 0 && (
        <input
          type="text"
          placeholder="Buscar por nombre (ej: 'Favori', 'IMG')"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-media-search"
          aria-label="Filtrar medios"
        />
      )}

      <label
        className={dragging ? "admin-dropzone admin-dropzone-active" : "admin-dropzone"}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files);
        }}
      >
        <input
          accept="image/*"
          disabled={busy}
          multiple
          onChange={(event) => {
            if (event.target.files) upload(event.target.files);
            event.target.value = "";
          }}
          type="file"
        />
        <strong>{busy ? "Subiendo…" : "Arrastra imágenes aquí o haz clic para elegirlas"}</strong>
        <small>Puedes seleccionar varias a la vez</small>
      </label>

      {loading ? (
        <p className="admin-media-empty">Cargando biblioteca…</p>
      ) : items.length === 0 ? (
        <p className="admin-media-empty">Todavía no hay imágenes cargadas.</p>
      ) : (
        <>
          {search && (
            <p className="admin-media-search-result">
              {items.filter((i) => i.filename.toLowerCase().includes(search.toLowerCase())).length} resultado(s)
            </p>
          )}
          <div className="admin-media-grid">
            {items
              .filter((i) => i.filename.toLowerCase().includes(search.toLowerCase()))
              .map((item) => (
            <figure
              className="admin-media-card"
              key={item.kv_key}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={item.filename} loading="lazy" src={item.url} />
              <figcaption>
                <strong title={item.filename}>{item.filename}</strong>
                <small>{formatSize(item.size)}</small>
              </figcaption>
              <div className="admin-media-actions">
                <button onClick={() => copyUrl(item)} type="button">Copiar ruta</button>
                <button onClick={() => remove(item)} type="button">Eliminar</button>
              </div>
            </figure>
              ))}
          </div>
        </>
      )}

    </section>
  );
}

function ContentPanel({ activeSection, content, onSave }: { activeSection: AdminSection; content: SiteContent; onSave: (content: SiteContent) => void }) {
  const [draft, setDraft] = useState(content);
  // Ajuste durante el render: al guardarse el contenido, el borrador se
  // reinicia sin pasar por un efecto.
  const [syncedContent, setSyncedContent] = useState(content);
  if (syncedContent !== content) {
    setSyncedContent(content);
    setDraft(content);
  }
  const data = activeSection === "banners" ? contentItems.banners : activeSection === "paginas" ? contentItems.paginas : contentItems.faqs;
  const title = activeSection === "banners" ? "Banners" : activeSection === "paginas" ? "Páginas" : "Preguntas frecuentes";
  const fields =
    activeSection === "banners"
      ? [
          ["bannerKitTitle", "Título banner kit"],
          ["bannerKitText", "Texto banner kit"],
          ["bannerKitCta", "Botón banner kit"],
          ["bannerColorsTitle", "Título banner colores"],
          ["bannerColorsText", "Texto banner colores"],
          ["bannerColorsCta", "Botón banner colores"],
        ]
      : activeSection === "paginas"
        ? [
            ["heroEyebrow", "Bajada superior inicio"],
            ["heroTitle", "Título inicio"],
            ["heroText", "Texto inicio"],
            ["heroCta", "Botón inicio"],
            ["catalogTitle", "Título catálogo"],
            ["catalogIntro", "Texto catálogo"],
            ["storyTitle", "Título nosotros"],
            ["storyText", "Texto nosotros"],
          ]
        : [
            ["faqQuestion", "Pregunta frecuente"],
            ["faqAnswer", "Respuesta"],
          ];


  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><p>Contenido dinámico</p><h2>{title}</h2></div><button onClick={() => onSave(draft)} type="button">Guardar y publicar</button></div>
      <div className="admin-content-cards">
        {data.map((item) => (
          <button className="admin-content-card" key={item.title} type="button">
            <span>{item.area}</span><strong>{item.title}</strong><p>Entrar para cambiar contenido, imagen, estado y orden.</p><em>{item.status}</em>
          </button>
        ))}
      </div>
      <div className="admin-form-grid admin-content-form">
        {fields.map(([key, label]) => (
          <label className={(key.includes("Text") || key.includes("Answer") || key.includes("Intro")) ? "admin-full-field" : ""} key={key}>
            <span>{label}</span>
            {(key.includes("Text") || key.includes("Answer") || key.includes("Intro")) ? (
              <textarea value={draft[key as keyof SiteContent]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            ) : (
              <input value={draft[key as keyof SiteContent]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}

function UsersPanel({
  admins,
  setAdmins,
}: {
  admins: { email: string; name: string; permissions: string; role: string }[];
  setAdmins: (admins: { email: string; name: string; permissions: string; role: string }[]) => void;
}) {


  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><p>Usuarios</p><h2>Administradores</h2></div><button type="button">Invitar usuario</button></div>
      <p className="admin-panel-intro">Gestiona roles, permisos y acceso a ediciones del catálogo.</p>
      <div className="admin-user-list">
        {admins.map((admin, index) => (
          <div className="admin-user-card" key={admin.email}>
            <label><span>Nombre</span><input value={admin.name} onChange={(event) => setAdmins(admins.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label>
            <label><span>Correo</span><input value={admin.email} onChange={(event) => setAdmins(admins.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} /></label>
            <label><span>Rol</span><select value={admin.role} onChange={(event) => setAdmins(admins.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))}><option>Administrador</option><option>Editor</option><option>Vendedor</option></select></label>
            <label><span>Permisos</span><input value={admin.permissions} onChange={(event) => setAdmins(admins.map((item, itemIndex) => itemIndex === index ? { ...item, permissions: event.target.value } : item))} /></label>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimplePanel({ intro, items, title }: { intro: string; items: string[]; title: string }) {


  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><p>Administración</p><h2>{title}</h2></div><button type="button">Entrar</button></div>
      <p className="admin-panel-intro">{intro}</p>
      <div className="admin-content-map">{items.map((item) => <span key={item}>{item}</span>)}</div>
    </section>
  );
}
