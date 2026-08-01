export type ProductVariant = {
  id: number;
  code: string;
  colorName: string;
  imageSource: string;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  color: string;
  price: number;
  weight: string;
  fiber: string;
  imageSource: string;
  imagePosition: string;
  imageSize: string;
  colorCount: number;
  colorsWithPhoto: string;
  allColors: string;
  length: string;
  needles: string;
  crochet: string;
  dozenPrice: string;
  /** Descripcion del producto (editada en el panel). */
  description?: string;
  /** Colores con foto propia. Vacio cuando el producto no tiene variantes. */
  variants?: ProductVariant[];
};

type SourceProduct = Omit<Product, "id" | "price"> & {
  kiloPrice: string;
};

const imagePresets = {
  atlas: { imageSource: "/catalogo/atlas.jpg", imageSize: "500% 500%", imagePosition: "0% 0%" },
  cristal: { imageSource: "/catalogo/cristal.jpg", imageSize: "500% 700%", imagePosition: "0% 0%" },
  favoriBatik: { imageSource: "/catalogo/favori-batik.jpg", imageSize: "500% 200%", imagePosition: "0% 0%" },
  sweetBaby: { imageSource: "/catalogo/sweet-baby.jpg", imageSize: "500% 300%", imagePosition: "0% 0%" },
  kittyBaby: { imageSource: "/catalogo/kitty-baby.jpg", imageSize: "500% 200%", imagePosition: "0% 0%" },
  merino: { imageSource: "/catalogo/merino.jpg", imageSize: "300% 420%", imagePosition: "50% 55%" },
  tanjaBatik: { imageSource: "/catalogo/tanja-batik.jpg", imageSize: "500% 300%", imagePosition: "0% 0%" },
  generic: { imageSource: "/productos-lanas.png", imageSize: "400% 200%", imagePosition: "0% 0%" },
};

function parsePrice(value: string) {
  const numeric = value.match(/\$?([\d.]+)/)?.[1]?.replaceAll(".", "");
  return numeric ? Number(numeric) : 0;
}

const sourceProducts: SourceProduct[] = [
  { category: "Lanas baby", name: "Favori Baby Batick", color: "12 colores", colorCount: 12, fiber: "100% Acrilico", weight: "100g", length: "360m", needles: "3-3.5-4", crochet: "2-3-4", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "651, 653, 654, 659, 660, 661, 662", allColors: "651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662", ...imagePresets.favoriBatik },
  { category: "Lanas baby", name: "Kitty Baby", color: "15 colores", colorCount: 15, fiber: "100% Acrilico", weight: "100g", length: "300m", needles: "3, 3.5, 4", crochet: "2-3-4", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "370, 371, 374, 376, 378, 379, 380, 388, 389, 390", allColors: "370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 382, 388, 389, 390", ...imagePresets.kittyBaby },
  { category: "Lanas baby", name: "Magic Baby", color: "12 colores", colorCount: 12, fiber: "100% Acrilico", weight: "100g", length: "360m", needles: "3-3.5", crochet: "2-3", kiloPrice: "$15.750 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412", ...imagePresets.sweetBaby },
  { category: "Lanas baby", name: "Super Baby", color: "34 colores", colorCount: 34, fiber: "100% Acrilico", weight: "100g", length: "340m", needles: "3-3.5-4", crochet: "3.5-4", kiloPrice: "$13.425 x kilo", dozenPrice: "$16.116 x docena", colorsWithPhoto: "114, 115, 121, 132, 135, 144, 145, 19, 2, 23, 29, 32, 39, 40, 42, 56, 64, 78", allColors: "1, 100, 11, 111, 114, 115, 121, 124, 127, 132, 135, 144, 145, 15, 19, 2, 23, 28, 29, 32, 33, 38, 39, 40, 42, 5, 56, 64, 7, 78, 90, 93, 95, 999", ...imagePresets.sweetBaby },
  { category: "Lanas baby", name: "Sweet Baby", color: "15 colores", colorCount: 15, fiber: "100% Acrilico", weight: "100g", length: "360m", needles: "3-3.5-4", crochet: "2-3-4", kiloPrice: "$16.425 x kilo", dozenPrice: "$19.710 x docena", colorsWithPhoto: "323, 324, 325, 326, 327, 328, 329, 330, 331, 333, 334, 335", allColors: "321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335", ...imagePresets.sweetBaby },
  { category: "Lanas clásica", name: "Atlas", color: "41 colores", colorCount: 41, fiber: "100% Acrilico", weight: "100g", length: "130m", needles: "6.5-7-6-8", crochet: "4-4.5-5", kiloPrice: "$13.430 x kilo", dozenPrice: "$16.116 x docena", colorsWithPhoto: "", allColors: "000, 001, 004, 007, 008, 009, 010, 012, 014, 015, 018, 019, 022, 027, 028, 029, 033, 035, 056, 059, 060, 079, 083, 087, 101, 107, 113, 115, 120, 121, 127, 132, 138, 146, 147, 150, 220, 300, 302, 305, 999", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Atlas Sport", color: "38 colores", colorCount: 38, fiber: "100% Acrilico", weight: "100g", length: "65m", needles: "9-10", crochet: "7-7.5-8", kiloPrice: "$13.430 x kilo", dozenPrice: "$16.116 x docena", colorsWithPhoto: "", allColors: "000, 001, 004, 007, 008, 009, 010, 012, 014, 019, 029, 033, 035, 052, 056, 059, 060, 077, 079, 083, 087, 101, 107, 113, 115, 120, 121, 127, 132, 138, 146, 147, 150, 220, 300, 302, 305, 999", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Dora", color: "68 colores", colorCount: 68, fiber: "100% Acrilico", weight: "100g", length: "240m", needles: "3-3.5", crochet: "3-3.5-4", kiloPrice: "$13.430 x kilo", dozenPrice: "$16.116 x docena", colorsWithPhoto: "002, 005, 008, 011, 022, 028, 033, 035, 039, 043, 047, 050, 060, 061, 077, 078, 087, 101, 103, 104, 107, 114, 132, 999", allColors: "000, 001, 002, 004, 005, 007, 008, 009, 011, 014, 015, 016, 018, 019, 022, 025, 026, 028, 029, 031, 033, 034, 035, 036, 039, 040, 042, 043, 045, 047, 050, 051, 056, 059, 060, 061, 066, 068, 070, 076, 077, 078, 079, 083, 087, 088, 099, 101, 102, 103, 104, 105, 107, 114, 115, 119, 124, 127, 130, 132, 135, 138, 145, 147, 220, 999", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Dora XL", color: "67 colores", colorCount: 67, fiber: "100% Acrilico", weight: "100g", length: "80m", needles: "5-6-7", crochet: "4.5-5-6", kiloPrice: "$13.430 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "000, 001, 002, 004, 005, 007, 008, 009, 011, 014, 015, 016, 018, 019, 022, 025, 026, 028, 029, 031, 033, 034, 035, 036, 039, 040, 042, 043, 045, 047, 050, 051, 056, 059, 060, 061, 066, 068, 070, 076, 077, 078, 079, 083, 087, 088, 099, 101, 102, 103, 104, 105, 107, 114, 115, 119, 124, 127, 130, 132, 135, 138, 145, 147, 220, 999", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Favori", color: "68 colores", colorCount: 68, fiber: "100% Acrilico", weight: "100g", length: "210m", needles: "3.5-4-4.5", crochet: "4-4.5-5", kiloPrice: "$13.430 x kilo", dozenPrice: "$16.116 x docena", colorsWithPhoto: "000, 004, 015, 018, 019, 022, 027, 028, 033, 034, 035, 045, 051, 059, 060, 077, 078, 079, 083, 087, 088, 099, 103, 104, 107, 108, 114, 119, 120, 123, 132, 147, 999", allColors: "000, 001, 002, 004, 005, 007, 008, 009, 010, 012, 014, 015, 016, 018, 019, 022, 023, 027, 028, 029, 033, 034, 035, 036, 039, 045, 047, 049, 051, 056, 059, 060, 061, 077, 078, 079, 083, 087, 088, 099, 100, 101, 103, 104, 105, 107, 108, 111, 113, 114, 115, 119, 120, 121, 123, 127, 132, 135, 138, 145, 146, 147, 150, 220, 300, 302, 304, 999", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Kristal", color: "61 colores", colorCount: 61, fiber: "100% Acrilico", weight: "100g", length: "450m", needles: "2.5-3", crochet: "2", kiloPrice: "$15.830 x kilo", dozenPrice: "$18.996 x docena", colorsWithPhoto: "", allColors: "000, 001, 002, 004, 005, 007, 008, 010, 012, 015, 016, 017, 019, 021, 022, 023, 025, 027, 028, 029, 032, 033, 034, 035, 038, 039, 040, 042, 056, 059, 060, 078, 079, 083, 084, 087, 088, 090, 093, 101, 103, 104, 105, 107, 111, 115, 120, 121, 124, 127, 130, 132, 135, 138, 144, 145, 147, 220, 941, 999", ...imagePresets.cristal },
  { category: "Lanas clásica", name: "La Sultana", color: "16 colores", colorCount: 16, fiber: "100% Acrilico", weight: "100g", length: "65m", needles: "9-10", crochet: "7-7.5-8", kiloPrice: "$13.430 x kilo", dozenPrice: "", colorsWithPhoto: "004, 005, 007, 009, 016, 019, 020, 033, 035, 049, 077, 083, 099, 100, 105", allColors: "004, 005, 007, 009, 016, 019, 020, 033, 035, 049, 059, 077, 083, 099, 100, 105", ...imagePresets.atlas },
  { category: "Lanas clásica", name: "Super Ovillo", color: "23 colores", colorCount: 23, fiber: "100% Acrilico", weight: "100g", length: "340m", needles: "3.5-4-4.5", crochet: "4-4.5-5", kiloPrice: "$13.425 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "004, 005, 007, 008, 009, 012, 014, 016, 018, 025, 028, 029, 033, 049, 056, 059, 079, 083, 099, 100, 101, 114, 119", ...imagePresets.atlas },
  { category: "Matizada", name: "Angora Batik", color: "12 colores", colorCount: 12, fiber: "10% Mohair / 10% Lana / 80% Acrilico", weight: "100g", length: "280m", needles: "3.5-4", crochet: "2.5-3", kiloPrice: "$17.180 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Camilla Batik", color: "17 colores", colorCount: 17, fiber: "49% Algodon / 51% Acrilico", weight: "100g", length: "260m", needles: "3.5-4-4.5", crochet: "3-3.5-4", kiloPrice: "$33.680 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Favori Baby Batick", color: "12 colores", colorCount: 12, fiber: "100% Acrilico", weight: "100g", length: "360m", needles: "3-3.5-4", crochet: "2-3-4", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "651, 653, 654, 659, 660, 661, 662", allColors: "651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Favori Batik", color: "19 colores", colorCount: 19, fiber: "100% Acrilico", weight: "100g", length: "210m", needles: "3.5-4.5-5", crochet: "4-4.5-5", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "", allColors: "900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 917, 924, 925, 926", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Favori Line", color: "12 colores", colorCount: 12, fiber: "100% Acrilico", weight: "100g", length: "210m", needles: "3.5-4-4.5", crochet: "4-4.5", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "601, 602, 603, 604, 609, 611, 612", allColors: "601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Favori Tweed", color: "10 colores", colorCount: 10, fiber: "100% Acrilico", weight: "100g", length: "210m", needles: "4-4.5-5", crochet: "4-4.5-5", kiloPrice: "$15.750 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "005C, 007B, 008B, 019A, 034C, 077A, 083A, 100B, 999C, 999D", ...imagePresets.favoriBatik },
  { category: "Matizada", name: "Merino Gold Batik", color: "12 colores", colorCount: 12, fiber: "49% Lana / 51% Acrilico", weight: "100g", length: "200m", needles: "4.5-5-5.5", crochet: "3-3.5-4", kiloPrice: "$21.680 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843", ...imagePresets.tanjaBatik },
  { category: "Matizada", name: "Sweet Baby", color: "15 colores", colorCount: 15, fiber: "100% Acrilico", weight: "100g", length: "360m", needles: "3-3.5-4", crochet: "2-3-4", kiloPrice: "$16.425 x kilo", dozenPrice: "$19.710 x docena", colorsWithPhoto: "323, 324, 325, 326, 327, 328, 329, 330, 331, 333, 334, 335", allColors: "321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335", ...imagePresets.sweetBaby },
  { category: "Matizada", name: "Tanja Batik", color: "12 colores", colorCount: 12, fiber: "100% Acrilico", weight: "100g", length: "130m", needles: "4-4.5-5-6", crochet: "4-4.5-5", kiloPrice: "$16.430 x kilo", dozenPrice: "$19.716 x docena", colorsWithPhoto: "500, 501, 502, 503, 504, 505, 507, 508, 509, 510, 511", allColors: "500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511", ...imagePresets.tanjaBatik },
  { category: "Matizada", name: "Trend Cake", color: "15 colores", colorCount: 15, fiber: "100% Acrilico", weight: "200g", length: "360m", needles: "4-4.5-5", crochet: "4-4.5-5", kiloPrice: "", dozenPrice: "", colorsWithPhoto: "", allColors: "620, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634", ...imagePresets.tanjaBatik },
  { category: "Algodón", name: "Camilla Batik", color: "17 colores", colorCount: 17, fiber: "49% Algodon / 51% Acrilico", weight: "100g", length: "260m", needles: "3.5-4-4.5", crochet: "3-3.5-4", kiloPrice: "$33.680 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116", ...imagePresets.favoriBatik },
  { category: "Algodón", name: "Madame Cotton", color: "54 colores", colorCount: 54, fiber: "49% Algodon / 51% Acrilico", weight: "100g", length: "280m", needles: "3-3.5-4", crochet: "2-2.5-3", kiloPrice: "$19.430 x kilo", dozenPrice: "$23.320 x docena", colorsWithPhoto: "000, 001, 002, 003, 004, 005, 006, 007, 008, 010, 011, 012, 014, 016, 019, 020, 022, 023, 024, 026, 028, 029, 030, 032, 035, 036, 037, 038, 042, 045, 049, 050, 051, 052, 054, 055, 056, 057, 058, 059, 999", allColors: "000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 042, 043, 045, 048, 049, 050, 051, 052, 054, 055, 056, 057, 058, 059, 999", ...imagePresets.generic },
  { category: "Algodón", name: "Madame Cotton Multicolor", color: "12 colores", colorCount: 12, fiber: "49% Algodon / 51% Acrilico", weight: "100g", length: "280m", needles: "3-3.5-4", crochet: "2-2.5-3", kiloPrice: "$20.180 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452", ...imagePresets.generic },
  { category: "Algodón", name: "Maxi Liso", color: "33 colores", colorCount: 33, fiber: "100% Algodon", weight: "100g", length: "565m", needles: "2-2.5-3", crochet: "2-3", kiloPrice: "$39.510 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "003, 1000, 4103, 4105, 4651, 4910, 4914, 4915, 4916, 4917, 4919, 4920, 5353, 5519, 5526, 5527, 5530, 5541, 5542, 6216, 6282, 6301, 6303, 6309, 6312, 6313, 6322, 6328, 6347, 6350, 6358, 6375, 9999", ...imagePresets.generic },
  { category: "Algodón", name: "Tena", color: "15 colores", colorCount: 15, fiber: "50% Algodon / 50% Acrilico", weight: "100g", length: "170m", needles: "3-3.5", crochet: "2.5-3-3.5", kiloPrice: "$28.710 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "0000, 0390, 0393, 0402, 0404, 0408, 0412, 0417, 0425, 0433, 0437, 0440, 0507, 0510, 0999", ...imagePresets.generic },
  { category: "Algodón", name: "Timya", color: "20 colores", colorCount: 20, fiber: "50% Algodon / 50% Acrilico", weight: "100g", length: "410m", needles: "1.5-2-2.5", crochet: "1.75-2", kiloPrice: "$30.510 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "0000, 5527, 5529, 5531, 5908, 5909, 5910, 5911, 5912, 5913, 5914, 5915, 5916, 5917, 5918, 5919, 5920, 5921, 5922, 9999", ...imagePresets.generic },
  { category: "Lana", name: "Merino Gold 200 Lisa", color: "39 colores", colorCount: 39, fiber: "49% Lana / 51% Acrilico", weight: "100g", length: "200m", needles: "4.5-5-5.5", crochet: "3-3.5-4", kiloPrice: "$18.750 x kilo", dozenPrice: "", colorsWithPhoto: "014, 051, 056, 059, 060, 083, 099, 100, 105", allColors: "001, 004, 007, 008, 009, 014, 015, 016, 018, 019, 029, 033, 034, 035, 036, 039, 042, 051, 056, 059, 060, 077, 079, 083, 088, 099, 100, 101, 103, 105, 107, 114, 115, 121, 127, 130, 132, 138, 999", ...imagePresets.merino },
  { category: "Lana", name: "Merino Gold Batik", color: "12 colores", colorCount: 12, fiber: "49% Lana / 51% Acrilico", weight: "100g", length: "200m", needles: "4.5-5-5.5", crochet: "3-3.5-4", kiloPrice: "$21.680 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843", ...imagePresets.tanjaBatik },
  { category: "Lanas Fantasía", name: "Angora", color: "31 colores", colorCount: 31, fiber: "10% Mohair / 10% Lana / 80% Acrilico", weight: "100g", length: "280m", needles: "3.5-4", crochet: "2.5-3", kiloPrice: "$15.750 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "001, 004, 007, 009, 014, 015, 016, 019, 033, 035, 039, 051, 056, 059, 060, 077, 079, 083, 088, 099, 100, 103, 107, 115, 121, 124, 127, 132, 135, 138, 999", ...imagePresets.favoriBatik },
  { category: "Lanas Fantasía", name: "Angora Batik", color: "12 colores", colorCount: 12, fiber: "10% Mohair / 10% Lana / 80% Acrilico", weight: "100g", length: "280m", needles: "3.5-4", crochet: "2.5-3", kiloPrice: "$17.180 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862", ...imagePresets.favoriBatik },
  { category: "Lanas Fantasía", name: "Favori Tweed", color: "10 colores", colorCount: 10, fiber: "100% Acrilico", weight: "100g", length: "210m", needles: "4-4.5-5", crochet: "4-4.5-5", kiloPrice: "$15.750 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "005C, 007B, 008B, 019A, 034C, 077A, 083A, 100B, 999C, 999D", ...imagePresets.favoriBatik },
  { category: "Lanas Fantasía", name: "Star Lurex", color: "18 colores", colorCount: 18, fiber: "94% Acrilico / 6% Metalico", weight: "100g", length: "320m", needles: "3.5-4-4.5", crochet: "3-3.5", kiloPrice: "$15.750 x kilo", dozenPrice: "$18.900 x docena", colorsWithPhoto: "000G, 000Y, 001Y, 004Y, 005A, 007G, 019T, 025T, 033K, 035K, 049Y-K, 060M, 078Y, 099A, 999A, 999G, 999S", allColors: "000G, 000Y, 001Y, 004Y, 005A, 007G, 019T, 025T, 033K, 035K, 049Y-K, 052M, 060M, 078Y, 099A, 999A, 999G, 999S", ...imagePresets.generic },
  { category: "Lanas Fantasía", name: "Yumosh", color: "32 colores", colorCount: 32, fiber: "100% Acrilico", weight: "100g", length: "150m", needles: "5-6-7-8", crochet: "6-7", kiloPrice: "$12.750 x kilo", dozenPrice: "", colorsWithPhoto: "", allColors: "000, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 952, 953, 954, 955, 958, 960, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 999", ...imagePresets.generic },
];

export const products: Product[] = sourceProducts.map((product, index) => ({
  ...product,
  id: index + 1,
  price: parsePrice(product.kiloPrice),
}));

export const categories = ["Todas", ...Array.from(new Set(products.map((product) => product.category)))];

export const categoryCatalog = categories
  .filter((category) => category !== "Todas")
  .map((category) => {
    const groupedProducts = products.filter((product) => product.category === category);
    return {
      category,
      brand: groupedProducts.slice(0, 4).map((product) => product.name).join(", "),
      variants: groupedProducts,
    };
  });
