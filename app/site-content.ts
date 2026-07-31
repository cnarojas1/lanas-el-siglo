/**
 * Textos editables del sitio.
 *
 * Los valores viven en la tabla `site_content` de D1 y se editan desde /admin.
 * Estos son los de fabrica: se usan para cualquier clave que aun no se haya
 * guardado, de modo que el sitio nunca renderiza huecos vacios.
 */
export const defaultSiteContent = {
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

export type SiteContent = typeof defaultSiteContent;
