import { env } from "cloudflare:workers";
import Storefront from "./storefront";
import { categories as fallbackCategories, products as fallbackProducts, type Product } from "./catalog-data";
import { defaultSiteContent, type SiteContent } from "./site-content";

// El catalogo vive en D1 y cambia sin redeploy, asi que la pagina se renderiza
// por peticion en lugar de quedar congelada en el build.
export const dynamic = "force-dynamic";

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
  kilo_price: string;
  dozen_price: string;
  image_source: string;
  image_position: string;
  image_size: string;
  color_count: number;
  colors_with_photo: string;
  all_colors: string;
};

function toProduct(row: ProductRow): Product {
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
    colorsWithPhoto: row.colors_with_photo,
    allColors: row.all_colors,
  };
}

async function loadCatalog(): Promise<{ products: Product[]; categories: string[] }> {
  // Si D1 no responde, el sitio sigue en pie con el catalogo incluido en el
  // bundle en vez de mostrar una tienda vacia.
  if (!env.DB) {
    return { products: fallbackProducts, categories: fallbackCategories };
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, category, color, fiber, weight, length, needles, crochet,
              price, kilo_price, dozen_price, image_source, image_position,
              image_size, color_count, colors_with_photo, all_colors
       FROM products
       WHERE visible = 1
       ORDER BY id`
    ).all<ProductRow>();

    if (!results.length) {
      return { products: fallbackProducts, categories: fallbackCategories };
    }

    const products = results.map(toProduct);
    const categories = ["Todas", ...new Set(products.map((product) => product.category))];
    return { products, categories };
  } catch (error) {
    console.error("No se pudo leer el catalogo desde D1:", error);
    return { products: fallbackProducts, categories: fallbackCategories };
  }
}

/** Textos editados en /admin; las claves ausentes caen a los valores de fabrica. */
async function loadSiteContent(): Promise<SiteContent> {
  if (!env.DB) return defaultSiteContent;

  try {
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM site_content"
    ).all<{ key: string; value: string }>();

    const saved = Object.fromEntries(
      results.filter((row) => row.key in defaultSiteContent).map((row) => [row.key, row.value])
    );
    return { ...defaultSiteContent, ...saved };
  } catch (error) {
    console.error("No se pudo leer el contenido del sitio desde D1:", error);
    return defaultSiteContent;
  }
}

export default async function Home() {
  const [{ products, categories }, siteContent] = await Promise.all([
    loadCatalog(),
    loadSiteContent(),
  ]);

  const whatsappNumber = ((env as { WHATSAPP_NUMBER?: string }).WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

  return (
    <Storefront
      categories={categories}
      products={products}
      siteContent={siteContent}
      whatsappNumber={whatsappNumber}
    />
  );
}
