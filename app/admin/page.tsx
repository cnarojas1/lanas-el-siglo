"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

type AdminProduct = {
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
  dozenPrice: string;
  imageSource: string;
  imagePosition: string;
  imageSize: string;
  colorCount: number;
  allColors: string;
  visible: boolean;
  description: string;
};

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

type AdminSection = "resumen" | "productos" | "categorias" | "cotizaciones" | "usuarios";

const adminSessionKey = "laneria-el-siglo-admin-session";

const sessionListeners = new Set<() => void>();

type Session = {
  token: string;
  user: { id?: number; name: string; email: string; role: string };
} | null;

// useSyncExternalStore exige que getSnapshot devuelva la MISMA referencia cada
// vez que el valor no cambio. Parsear y crear un objeto nuevo en cada llamada es
// interpretado por React como "el store cambio siempre" y entra en un bucle de
// re-render ("Maximum update depth exceeded"). Cacheamos el snapshot y solo
// devolvemos una referencia nueva cuando sessionStorage cambia de verdad.
let cachedRaw: string | null;
let cachedSession: Session;

function getSessionSnapshot(): Session {
  try {
    const raw = window.sessionStorage.getItem(adminSessionKey);
    if (raw === cachedRaw) return cachedSession;
    cachedRaw = raw;
    if (raw) cachedSession = JSON.parse(raw) as Session;
    else cachedSession = null;
    return cachedSession;
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  if (session) window.sessionStorage.setItem(adminSessionKey, JSON.stringify(session));
  else window.sessionStorage.removeItem(adminSessionKey);
  sessionListeners.forEach((listener) => listener());
}

function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

const NAV: { id: AdminSection; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "productos", label: "Productos" },
  { id: "categorias", label: "Categorías" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "usuarios", label: "Usuarios" },
];

const roleName: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
};

export default function AdminPage() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null);
  const [activeSection, setActiveSection] = useState<AdminSection>("resumen");
  const [notice, setNotice] = useState("");

  function signOut() {
    writeSession(null);
    setActiveSection("resumen");
    setNotice("Sesión cerrada.");
  }

  const canWrite = Boolean(session && session.user.role !== "viewer");
  const isAdmin = Boolean(session && session.user.role === "admin");

  // Sin sesion: pantalla de login dedicada y limpia, sin sidebar ni topbar.
  if (!session) {
    return (
      <main className="admin-gate-wrap">
        <LoginForm setNotice={setNotice} />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          Lanería El Siglo
        </Link>
        <nav aria-label="Panel administrativo">
          {NAV.map((item) => (
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
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Panel administrativo</p>
            <h1>Gestión de tienda</h1>
          </div>
          <div className="admin-topbar-actions">
            {session && (
              <span className="admin-session-user">
                {session.user.name}
                <em>{roleName[session.user.role] ?? session.user.role}</em>
              </span>
            )}
            {session ? (
              <button className="admin-session-out" onClick={signOut} type="button">
                Cerrar sesión
              </button>
            ) : null}
            <Link href="/">Ver tienda</Link>
          </div>
        </header>

          <>
            {notice && <div className="admin-notice">{notice}</div>}
            {activeSection === "resumen" && (
              <ResumenPanel setActiveSection={setActiveSection} canWrite={canWrite} />
            )}
            {activeSection === "productos" && (
              <ProductsContainer canWrite={canWrite} session={session} setNotice={setNotice} />
            )}
            {activeSection === "categorias" && (
              <CategoriesPanel canWrite={canWrite} session={session} setNotice={setNotice} />
            )}
            {activeSection === "cotizaciones" && (
              <OrdersPanel canWrite={canWrite} session={session} />
            )}
            {activeSection === "usuarios" &&
              (isAdmin ? (
                <UsersPanel setNotice={setNotice} session={session} />
              ) : (
                <p className="admin-media-empty">
                  Solo un administrador puede gestionar usuarios.
                </p>
              ))}
          </>
      </section>
    </main>
  );
}

function LoginForm({ setNotice }: { setNotice: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await response.json()) as {
        token?: string;
        user?: { id: number; name: string; email: string; role: string };
        error?: string;
      };
      if (!response.ok || !body.token || !body.user) {
        setError(body.error ?? "No se pudo iniciar sesión.");
        return;
      }
      writeSession({ token: body.token, user: body.user });
      setNotice(`Bienvenido/a, ${body.user.name}.`);
    } catch {
      setError("No se pudo iniciar sesión. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-gate" onSubmit={submit}>
      <div>
        <strong>Lanería El Siglo</strong>
        <p>Accede al panel de administración.</p>
      </div>
      <label>
        <span className="admin-gate-label">Correo</span>
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@laneriaelsiglo.cl"
          type="email"
          value={email}
        />
      </label>
      <label>
        <span className="admin-gate-label">Contraseña</span>
        <input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          type="password"
          value={password}
        />
      </label>
      {error && <p className="admin-gate-error">{error}</p>}
      <button disabled={busy} type="submit">
        {busy ? "Ingresando…" : "Entrar al panel"}
      </button>
    </form>
  );
}

/** Envuelve las escrituras con una sesion valida. Devuelve el cuerpo (o lanza). */
async function sessionFetch(session: { token: string } | null, url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${session?.token ?? ""}`,
    },
  });
  let body: Record<string, unknown>;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Error ${response.status}`
    );
  }
  return { response, body };
}

function ResumenPanel({
  setActiveSection,
  canWrite,
}: {
  setActiveSection: (section: AdminSection) => void;
  canWrite: boolean;
}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<{ category: string; total: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch("/api/products?limit=100"),
          fetch("/api/admin/categories"),
        ]);
        if (cancelled) return;
        if (productsResponse.ok) {
          const { data } = (await productsResponse.json()) as { data: ProductRow[] };
          if (data) setProducts(data.map(toAdminProduct));
        }
        if (categoriesResponse.ok) {
          const { categories: list } = (await categoriesResponse.json()) as {
            categories: { category: string; total: number }[];
          };
          if (list) setCategories(list);
        }
      } catch {
        // silencioso: resumen no bloqueante
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCount = products.filter((product) => product.visible).length;
  const priced = products.filter((product) => product.price > 0);
  const average = Math.round(
    priced.reduce((sum, product) => sum + product.price, 0) / Math.max(priced.length, 1)
  );

  return (
    <>
      <section className="admin-stats">
        <article>
          <span>Productos</span>
          <strong>{products.length}</strong>
          <p>Entradas en catálogo</p>
        </article>
        <article>
          <span>Visibles</span>
          <strong>{visibleCount}</strong>
          <p>Publicados en la tienda</p>
        </article>
        <article>
          <span>Categorías</span>
          <strong>{categories.length}</strong>
          <p>Familias de lanas</p>
        </article>
        <article>
          <span>Precio promedio</span>
          <strong>{average > 0 ? money.format(average) : "—"}</strong>
          <p>Productos con precio</p>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p>Catálogo</p>
              <h2>Productos</h2>
            </div>
            <button onClick={() => setActiveSection("productos")} type="button">
              Gestionar
            </button>
          </div>
          <div className="admin-category-list">
            <div>
              <strong>{visibleCount} visibles</strong>
              <span>{products.length - visibleCount} ocultos</span>
              <small>Edita nombre, precio, categoría y fotos</small>
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p>Catálogo</p>
              <h2>Categorías</h2>
            </div>
            <button onClick={() => setActiveSection("categorias")} type="button">
              Gestionar
            </button>
          </div>
          <div className="admin-category-list">
            {categories.slice(0, 6).map((group) => (
              <div key={group.category}>
                <strong>{group.category}</strong>
                <span>{group.total} producto(s)</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {canWrite && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p>Accesos rápidos</p>
              <h2>Para empezar</h2>
            </div>
          </div>
          <div className="admin-content-map">
            <button onClick={() => setActiveSection("productos")} type="button">
              Editar productos
            </button>
            <button onClick={() => setActiveSection("categorias")} type="button">
              Organizar categorías
            </button>
            <button onClick={() => setActiveSection("cotizaciones")} type="button">
              Ver cotizaciones
            </button>
          </div>
        </section>
      )}
    </>
  );
}

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
    dozenPrice: row.dozen_price ?? "",
    imageSource: row.image_source ?? "",
    imagePosition: row.image_position ?? "center",
    imageSize: row.image_size ?? "cover",
    colorCount: row.color_count ?? 1,
    allColors: row.all_colors ?? "",
    visible: row.visible === 1,
    description: row.description ?? "",
  };
}

function ProductsContainer({
  canWrite,
  session,
  setNotice,
}: {
  canWrite: boolean;
  session: { token: string } | null;
  setNotice: (message: string) => void;
}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const selected = products.find((product) => product.id === selectedId) ?? products[0];

  async function refresh() {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/admin/categories"),
      ]);
      if (productsResponse.ok) {
        const { data } = (await productsResponse.json()) as { data: ProductRow[] };
        if (data?.length) {
          setProducts(data.map(toAdminProduct));
          setSelectedId((current) => {
            if (current && data.some((row) => row.id === current)) return current;
            return data[0].id;
          });
        }
      }
      if (categoriesResponse.ok) {
        const { categories: list } = (await categoriesResponse.json()) as {
          categories: { category: string }[];
        };
        if (list) setCategories(list.map((item) => item.category));
      }
    } catch {
      setNotice("No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="admin-media-empty">Cargando productos…</p>;

  return (
    <section className="admin-grid admin-products-layout">
      <article className="admin-panel admin-products-list">
        <div className="admin-panel-heading">
          <div>
            <p>Productos</p>
            <h2>Listado de productos</h2>
          </div>
          <span className="admin-panel-count">{products.length} producto(s)</span>
        </div>
        {products.length === 0 ? (
          <p className="admin-media-empty">No hay productos.</p>
        ) : (
          <div className="admin-table">
            {products.map((product) => (
              <button
                className={
                  product.id === selected?.id
                    ? "admin-row admin-row-button admin-row-selected"
                    : "admin-row admin-row-button"
                }
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                type="button"
              >
                <ProductThumb product={product} />
                <div>
                  <strong>{product.name}</strong>
                  <small className="admin-row-detail">
                    {product.weight} · {product.fiber || "—"} · {product.category}
                  </small>
                </div>
                <b>{product.price > 0 ? money.format(product.price) : "Consultar"}</b>
                <em>{product.visible ? "Visible" : "Oculto"}</em>
              </button>
            ))}
          </div>
        )}
      </article>

      {selected && (
        <ProductEditor
          categories={categories}
          canWrite={canWrite}
          key={selected.id}
          product={selected}
          session={session}
          setNotice={setNotice}
          onSaved={() => refresh()}
        />
      )}
    </section>
  );
}

function ProductThumb({ product }: { product: AdminProduct }) {
  return (
    <span
      className="admin-thumb"
      style={{
        backgroundImage: product.imageSource ? `url("${product.imageSource}")` : undefined,
        backgroundPosition: product.imagePosition ?? "center",
        backgroundSize: product.imageSize ?? "cover",
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

type ImageTarget =
  | { kind: "product" }
  | { kind: "variant"; id: number; code: string }
  | { kind: "bulk" };

type MediaItem = { id: number; filename: string; folder: string; url: string };

function ProductEditor({
  categories,
  canWrite,
  product,
  session,
  setNotice,
  onSaved,
}: {
  categories: string[];
  canWrite: boolean;
  product: AdminProduct;
  session: { token: string } | null;
  setNotice: (message: string) => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<AdminProduct>(product);
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaFolder, setMediaFolder] = useState("Todas");
  const [modalTab, setModalTab] = useState<"medios" | "subir">("medios");
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsBusy, setVariantsBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkDrafts, setBulkDrafts] = useState<Record<string, { code: string; color_name: string }>>({});
  const [saving, setSaving] = useState(false);

  async function sessionFetchGen(url: string, init: RequestInit) {
    return sessionFetch(session, url, init);
  }

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
        const { media } = (await response.json()) as { media: MediaItem[] };
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

  async function saveProduct() {
    if (!canWrite) return;
    setSaving(true);
    try {
      await sessionFetchGen("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name: draft.name,
          category: draft.category,
          price: draft.price,
          description: draft.description,
          visible: draft.visible,
          image_source: draft.imageSource,
        }),
      });
      setNotice(`"${draft.name}" guardado. Ya está actualizado en la tienda.`);
      onSaved();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  const declaredCodes = (draft.allColors ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  const availableCodes = declaredCodes.filter((code) => !variants.some((variant) => variant.code === code));

  function suggestedBulkCode(index: number) {
    return availableCodes[index] ?? "";
  }

  async function seedVariants() {
    if (!declaredCodes.length) {
      setNotice('Escribe los códigos en "Colores / códigos" antes de generarlos.');
      return;
    }
    setVariantsBusy(true);
    try {
      const { body } = await sessionFetchGen("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, codes: declaredCodes }),
      });
      const next = (body as { variants: Variant[] }).variants ?? [];
      setVariants(next);
      setNotice(`${next.length} código(s) disponibles para ${draft.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron generar los códigos.");
    } finally {
      setVariantsBusy(false);
    }
  }

  async function patchVariant(
    id: number,
    patch: Partial<Pick<Variant, "code" | "color_name" | "image_source">>
  ) {
    setVariants((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    try {
      await sessionFetchGen("/api/admin/variants", {
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
      await sessionFetchGen(`/api/admin/variants?id=${variant.id}`, { method: "DELETE" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar el código.");
    }
  }

  async function addPickedImages() {
    if (!picked.length) return;
    const nextVariants = picked.map((url, index) => {
      const d = bulkDrafts[url] ?? { code: suggestedBulkCode(index), color_name: "" };
      return {
        code: d.code.trim(),
        color_name: d.color_name.trim(),
        image_source: url,
      };
    });
    setVariantsBusy(true);
    try {
      const { body } = await sessionFetchGen("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          variants: nextVariants,
          available_codes: declaredCodes,
        }),
      });
      const next = (body as { variants: Variant[] }).variants ?? [];
      setVariants(next);
      setNotice(
        `${picked.length} foto(s) agregadas a ${draft.name}. Ajusta el código y el nombre de cada color.`
      );
      setPicked([]);
      setBulkDrafts({});
      setImageTarget(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron agregar las fotos.");
    } finally {
      setVariantsBusy(false);
    }
  }

  function applyImage(url: string) {
    if (!imageTarget) return;
    if (imageTarget.kind === "bulk") {
      setPicked((current) => {
        if (current.includes(url)) return current.filter((item) => item !== url);
        const nextIndex = current.length;
        setBulkDrafts((drafts) => ({
          ...drafts,
          [url]: drafts[url] ?? { code: suggestedBulkCode(nextIndex), color_name: "" },
        }));
        return [...current, url];
      });
      return;
    }
    if (imageTarget.kind === "product") {
      setDraft({ ...draft, imageSource: url });
      setNotice('Imagen principal actualizada. Pulsa "Guardar cambios" para publicarla.');
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
      const { body } = await sessionFetchGen("/api/admin/media", { method: "POST", body: form });
      const uploaded = (body as { uploaded: { url: string }[] }).uploaded ?? [];
      if (!uploaded.length) {
        setNotice("No se subió ninguna imagen.");
        return;
      }
      if (imageTarget?.kind === "bulk") {
        const uploadedUrls = uploaded.map((item) => item.url);
        setPicked((current) => {
          const fresh = uploadedUrls.filter((url) => !current.includes(url));
          setBulkDrafts((drafts) => {
            const next = { ...drafts };
            fresh.forEach((url, index) => {
              next[url] = next[url] ?? {
                code: suggestedBulkCode(current.length + index),
                color_name: "",
              };
            });
            return next;
          });
          return [...current, ...fresh];
        });
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

  const mediaFolders = [
    "Todas",
    ...Array.from(new Set(mediaList.map((media) => media.folder || "Sin carpeta"))).sort((a, b) =>
      a.localeCompare(b, "es")
    ),
  ];
  const visibleMedia = mediaList.filter((media) => {
    const text = `${media.folder} ${media.filename}`.toLowerCase();
    const matchesFolder = mediaFolder === "Todas" || media.folder === mediaFolder;
    return matchesFolder && text.includes(mediaSearch.toLowerCase());
  });

  return (
    <>
      <div className="admin-editor-column">
        <article className="admin-panel admin-editor">
          <div className="admin-panel-heading">
            <div>
              <p>Ficha editable</p>
              <h2>{draft.name || "Ficha de producto"}</h2>
            </div>
            {canWrite && (
              <button disabled={saving} onClick={saveProduct} type="button">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
          </div>
          <div className="admin-editor-content">
            <div className="admin-editor-image">
              <div className="admin-main-image-card">
                <div className="admin-main-image-heading">
                  <span>Imagen principal actual</span>
                  <strong>{draft.name || "Producto"}</strong>
                </div>
                <div className="admin-image-display admin-main-image-display">
                  {draft.imageSource ? (
                    <>
                      <span className="admin-main-image-badge">Principal</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={draft.name} src={draft.imageSource} />
                    </>
                  ) : (
                    <div className="admin-image-empty">Sin imagen principal</div>
                  )}
                </div>
                <p className="admin-main-image-help">
                  Esta es la imagen que aparece primero en la tarjeta del catálogo.
                </p>
                {canWrite && (
                  <button
                    className="admin-image-picker-btn-large"
                    onClick={() => setImageTarget({ kind: "product" })}
                    type="button"
                  >
                    {draft.imageSource ? "Cambiar imagen principal" : "Seleccionar imagen principal"}
                  </button>
                )}
              </div>

              {variants.some((variant) => variant.image_source) && (
                <div className="admin-main-image-thumbs">
                  <span>Miniaturas de colores</span>
                  <div>
                    {variants
                      .filter((variant) => variant.image_source)
                      .map((variant) => (
                        <button
                          className={
                            variant.image_source === draft.imageSource
                              ? "admin-main-thumb admin-main-thumb-active"
                              : "admin-main-thumb"
                          }
                          disabled={!canWrite}
                          key={variant.id}
                          onClick={() => setDraft({ ...draft, imageSource: variant.image_source })}
                          title={variant.color_name || variant.code}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={variant.color_name || variant.code} src={variant.image_source} />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-editor-form">
              <div className="admin-form-row">
                <label>
                  <span>Nombre del producto</span>
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Categoría</span>
                  <select
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  <span>Precio</span>
                  <input
                    min="0"
                    type="number"
                    value={draft.price}
                    onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })}
                  />
                </label>
                <label>
                  <span>Precio docena</span>
                  <input
                    value={draft.dozenPrice}
                    onChange={(event) => setDraft({ ...draft, dozenPrice: event.target.value })}
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  <span>Composición</span>
                  <input
                    value={draft.fiber}
                    onChange={(event) => setDraft({ ...draft, fiber: event.target.value })}
                  />
                </label>
                <label>
                  <span>Gramaje</span>
                  <input
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
                  />
                </label>
              </div>
              <label className="admin-form-full">
                <span>Colores / códigos</span>
                <input
                  value={draft.allColors}
                  onChange={(event) => setDraft({ ...draft, allColors: event.target.value })}
                />
              </label>
              <label className="admin-form-full">
                <span>Descripción</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
              {canWrite && (
                <label className="admin-switch">
                  <input
                    checked={draft.visible}
                    type="checkbox"
                    onChange={(event) => setDraft({ ...draft, visible: event.target.checked })}
                  />
                  <span>Visible en la tienda</span>
                </label>
              )}
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
            {canWrite && (
              <div className="admin-variants-actions">
                <button
                  disabled={variantsBusy}
                  onClick={() => {
                    setPicked([]);
                    setBulkDrafts({});
                    setModalTab("medios");
                    setImageTarget({ kind: "bulk" });
                  }}
                  type="button"
                >
                  Agregar fotos
                </button>
                <button
                  className="admin-variants-secondary"
                  disabled={variantsBusy}
                  onClick={seedVariants}
                  type="button"
                >
                  {variantsBusy ? "Trabajando…" : "Generar desde códigos"}
                </button>
              </div>
            )}
          </div>

          {!canWrite && (
            <p className="admin-variants-locked">
              Tu rol es de solo lectura: no puedes editar los colores de un producto.
            </p>
          )}

          {variants.length === 0 ? (
            <p className="admin-variants-empty">
              Todavía no hay colores. <strong>Agregar fotos</strong> te deja marcar varias
              imágenes de la biblioteca y crea un color por cada una.{" "}
              <strong>Generar desde códigos</strong> crea uno por cada valor del campo{" "}
              <em>Colores / códigos</em>.
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
                    onClick={() => {
                      setModalTab("medios");
                      setImageTarget({ kind: "variant", id: variant.id, code: variant.code });
                    }}
                    title={canWrite ? "Elegir imagen para este código" : "Solo lectura"}
                    type="button"
                  >
                    {variant.image_source ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={variant.code} src={variant.image_source} />
                    ) : (
                      <span>Sin foto</span>
                    )}
                  </button>
                  <input
                    aria-label={`Código ${variant.code}`}
                    className="admin-variant-code"
                    disabled={!canWrite}
                    list={`codigos-${product.id}`}
                    defaultValue={variant.code}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (canWrite && next && next !== variant.code) {
                        patchVariant(variant.id, { code: next });
                      }
                    }}
                  />
                  <input
                    aria-label={`Nombre del color ${variant.code}`}
                    className="admin-variant-color"
                    defaultValue={variant.color_name}
                    disabled={!canWrite}
                    placeholder="Nombre del color"
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (canWrite && next !== variant.color_name) {
                        patchVariant(variant.id, { color_name: next });
                      }
                    }}
                  />
                  {canWrite && (
                    <button
                      className="admin-variant-remove"
                      onClick={() => removeVariant(variant)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  )}
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
                  ? `Imagen principal de ${draft.name}`
                  : imageTarget.kind === "bulk"
                    ? `Agregar colores a ${draft.name}`
                    : `Imagen del código ${imageTarget.code}`}
              </h2>
              <button
                aria-label="Cerrar"
                className="admin-modal-close"
                onClick={() => setImageTarget(null)}
                type="button"
              >
                ×
              </button>
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
                  <div className="admin-media-tools">
                    <input
                      aria-label="Buscar imagen"
                      className="admin-media-search"
                      onChange={(event) => setMediaSearch(event.target.value)}
                      placeholder="Buscar por nombre o carpeta (ej: Favori, Kitty, IMG)"
                      type="text"
                      value={mediaSearch}
                    />
                    <select
                      aria-label="Filtrar por carpeta"
                      className="admin-media-folder-select"
                      onChange={(event) => setMediaFolder(event.target.value)}
                      value={mediaFolder}
                    >
                      {mediaFolders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  </div>
                  {imageTarget.kind === "bulk" && (
                    <p className="admin-modal-hint">
                      Marca las fotos y revisa abajo el código y nombre de color antes de
                      agregarlas.
                    </p>
                  )}
                  <div className="admin-media-grid-modal">
                    {visibleMedia.map((media) => {
                      const marked = picked.includes(media.url);
                      return (
                        <button
                          aria-pressed={imageTarget.kind === "bulk" ? marked : undefined}
                          className={
                            marked ? "admin-media-card-modal admin-media-card-picked" : "admin-media-card-modal"
                          }
                          key={media.id}
                          onClick={() => applyImage(media.url)}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={media.filename} loading="lazy" src={`${media.url}?preview=${media.id}`} />
                          <span className="admin-media-folder-label">{media.folder}</span>
                          <small>{media.filename}</small>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {imageTarget.kind === "bulk" && (
                <div className="admin-bulk-review">
                  {picked.length > 0 && (
                    <div className="admin-bulk-list">
                      {picked.map((url, index) => {
                        const d = bulkDrafts[url] ?? { code: suggestedBulkCode(index), color_name: "" };
                        const media = mediaList.find((item) => item.url === url);
                        return (
                          <div className="admin-bulk-row" key={url}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt={media?.filename ?? `Color ${index + 1}`} src={url} />
                            <label>
                              <span>Código</span>
                              <input
                                list={`codigos-${product.id}`}
                                onChange={(event) =>
                                  updateBulkDraft(url, { code: event.target.value })
                                }
                                placeholder={suggestedBulkCode(index) || "Código"}
                                value={d.code}
                              />
                            </label>
                            <label>
                              <span>Color</span>
                              <input
                                onChange={(event) =>
                                  updateBulkDraft(url, { color_name: event.target.value })
                                }
                                placeholder="Nombre del color"
                                value={d.color_name}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="admin-modal-footer">
                    <span>{picked.length} foto(s) marcadas</span>
                    <button
                      disabled={!picked.length || variantsBusy}
                      onClick={addPickedImages}
                      type="button"
                    >
                      {variantsBusy ? "Agregando…" : `Agregar ${picked.length || ""} color(es)`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  function updateBulkDraft(url: string, patch: Partial<{ code: string; color_name: string }>) {
    setBulkDrafts((current) => ({
      ...current,
      [url]: { ...(current[url] ?? { code: "", color_name: "" }), ...patch },
    }));
  }
}

function CategoriesPanel({
  canWrite,
  session,
  setNotice,
}: {
  canWrite: boolean;
  session: { token: string } | null;
  setNotice: (message: string) => void;
}) {
  const [list, setList] = useState<{ category: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const response = await fetch("/api/admin/categories");
      const { categories } = (await response.json()) as {
        categories: { category: string; total: number }[];
      };
      setList(categories ?? []);
    } catch {
      setNotice("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p>Catálogo</p>
          <h2>Categorías</h2>
        </div>
        <span className="admin-panel-count">{list.length} categoría(s)</span>
      </div>
      <p className="admin-panel-intro">
        Las categorías se toman de los productos. Renombrar una categoría actualiza todos los
        productos que la usan. Para crear una nueva, asigna el nombre desde la ficha de un
        producto.
      </p>
      {loading ? (
        <p className="admin-media-empty">Cargando categorías…</p>
      ) : list.length === 0 ? (
        <p className="admin-media-empty">Todavía no hay categorías.</p>
      ) : (
        <div className="admin-edit-list">
          {list.map((group) => (
            <CategoryRow
              canWrite={canWrite}
              group={group}
              key={group.category}
              onRenamed={() => {
                setNotice(`"${group.category}" renombrada.`);
                refresh();
              }}
              session={session}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryRow({
  canWrite,
  group,
  onRenamed,
  session,
}: {
  canWrite: boolean;
  group: { category: string; total: number };
  onRenamed: () => void;
  session: { token: string } | null;
}) {
  const [value, setValue] = useState(group.category);
  const [busy, setBusy] = useState(false);

  useEffect(() => setValue(group.category), [group.category]);

  async function rename() {
    const to = value.trim();
    if (!to || to === group.category) return;
    setBusy(true);
    try {
      await sessionFetch(session, "/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: group.category, to }),
      });
      onRenamed();
    } catch {
      // sessionFetch lanza el error; el padre refresca y muestra el resultado real si hubo cambios.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-category-row" key={group.category}>
      <input
        aria-label={`Renombrar categoría ${group.category}`}
        disabled={!canWrite}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <span className="admin-category-total">{group.total} producto(s)</span>
      {canWrite && (
        <button disabled={busy || value.trim() === group.category} onClick={rename} type="button">
          {busy ? "Guardando…" : "Renombrar"}
        </button>
      )}
    </div>
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
  canWrite,
  session,
}: {
  canWrite: boolean;
  session: { token: string } | null;
}) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;
    async function load() {
      try {
        const { body } = await sessionFetch(session, "/api/orders", { method: "GET" });
        const rows = (body as { orders: OrderRow[] }).orders ?? [];
        if (!cancelled) {
          setOrders(rows);
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
  }, [canWrite, session]);

  if (!canWrite) {
    return (
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p>Solicitudes</p>
            <h2>Cotizaciones</h2>
          </div>
        </div>
        <p className="admin-media-empty">Tu rol no permite ver las cotizaciones.</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p>Solicitudes</p>
          <h2>Cotizaciones</h2>
        </div>
        <span className="admin-panel-count">{orders.length} cotización(es)</span>
      </div>

      {state === "loading" ? (
        <p className="admin-media-empty">Cargando cotizaciones…</p>
      ) : state === "error" ? (
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
                <div>
                  <dt>Cliente</dt>
                  <dd>{order.user_name || "Sin identificar"}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>{order.user_email || "—"}</dd>
                </div>
                {order.user_phone && (
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{order.user_phone}</dd>
                  </div>
                )}
                <div>
                  <dt>Despacho</dt>
                  <dd>{order.shipping_address || "—"}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{order.created_at}</dd>
                </div>
                {order.notes && (
                  <div>
                    <dt>Comentarios</dt>
                    <dd>{order.notes}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: number;
};

function UsersPanel({
  session,
  setNotice,
}: {
  session: { token: string } | null;
  setNotice: (message: string) => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bootstrapAuth, setBootstrapAuth] = useState(false);

  async function refresh() {
    try {
      const { body } = await sessionFetch(session, "/api/admin/users", { method: "GET" });
      setUsers((body as { users: UserRow[] }).users ?? []);
      setBootstrapAuth(Boolean((body as { bootstrapAuth: boolean }).bootstrapAuth));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <p>Usuarios</p>
          <h2>Accesos al panel</h2>
        </div>
        <button onClick={() => setShowForm((current) => !current)} type="button">
          {showForm ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>
      <p className="admin-panel-intro">
        Cada persona tiene su propia cuenta y contraseña para entrar al panel.
        {bootstrapAuth
          ? " Estás conectado/a con la contraseña maestra (ADMIN_TOKEN): crea cuentas por persona desde aquí."
          : ""}
      </p>

      {showForm && (
        <UserForm
          onDone={() => {
            setShowForm(false);
            refresh();
          }}
          session={session}
          setNotice={setNotice}
        />
      )}

      {loading ? (
        <p className="admin-media-empty">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <p className="admin-media-empty">
          Todavía no hay cuentas. Usa la contraseña maestra para crear la primera.
        </p>
      ) : (
        <div className="admin-user-list">
          {users.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-head">
                <strong>{user.name}</strong>
                <em>{roleName[user.role] ?? user.role}</em>
              </div>
              <p>{user.email}</p>
              <div className="admin-user-actions">
                <ToggleRole
                  session={session}
                  setNotice={setNotice}
                  user={user}
                  onChanged={() => refresh()}
                />
                <DeleteUser
                  session={session}
                  setNotice={setNotice}
                  user={user}
                  onDeleted={() => refresh()}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function UserForm({
  onDone,
  session,
  setNotice,
}: {
  onDone: () => void;
  session: { token: string } | null;
  setNotice: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await sessionFetch(session, "/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      setNotice(`Usuario "${name}" creado.`);
      onDone();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-user-form" onSubmit={submit}>
      <label>
        <span>Nombre</span>
        <input onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      <label>
        <span>Correo</span>
        <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      </label>
      <label>
        <span>Contraseña (mín. 8)</span>
        <input
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <label>
        <span>Rol</span>
        <select onChange={(event) => setRole(event.target.value)} value={role}>
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Solo lectura</option>
        </select>
      </label>
      <button disabled={busy} type="submit">
        {busy ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}

function ToggleRole({
  session,
  setNotice,
  user,
  onChanged,
}: {
  session: { token: string } | null;
  setNotice: (message: string) => void;
  user: UserRow;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function change(nextRole: string) {
    setBusy(true);
    try {
      await sessionFetch(session, "/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: nextRole }),
      });
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cambiar el rol.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      aria-label={`Rol de ${user.name}`}
      disabled={busy}
      onChange={(event) => change(event.target.value)}
      value={user.role}
    >
      <option value="admin">Administrador</option>
      <option value="editor">Editor</option>
      <option value="viewer">Solo lectura</option>
    </select>
  );
}

function DeleteUser({
  session,
  setNotice,
  user,
  onDeleted,
}: {
  session: { token: string } | null;
  setNotice: (message: string) => void;
  user: UserRow;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`¿Eliminar la cuenta de "${user.name}"?`)) return;
    setBusy(true);
    try {
      await sessionFetch(session, `/api/admin/users?id=${user.id}`, { method: "DELETE" });
      setNotice(`Cuenta de "${user.name}" eliminada.`);
      onDeleted();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="admin-variant-remove" disabled={busy} onClick={remove} type="button">
      {busy ? "…" : "Eliminar"}
    </button>
  );
}

