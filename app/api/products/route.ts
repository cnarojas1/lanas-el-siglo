import { json } from 'next/server';

interface Env {
  DB?: D1Database;
}

/**
 * GET /api/products
 * Obtiene lista de productos de la base de datos D1
 */
export async function GET(request: Request) {
  // Obtener parámetros de query
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // Este es un ejemplo - en producción obtendrías el DB del contexto
    // const db = (env as Env).DB;

    // Por ahora retornamos datos estáticos
    // Una vez conectado D1, cambiarás a:
    // const result = await db.prepare('SELECT * FROM products WHERE ...');

    const products = [
      {
        id: 1,
        name: 'Sweet Baby',
        category: 'Lanas baby',
        price: 16425,
        color: '15 colores',
        fiber: '100% Acrilico',
        weight: '100g',
        length: '360m',
      },
      {
        id: 2,
        name: 'Super Baby',
        category: 'Lanas baby',
        price: 13425,
        color: '34 colores',
        fiber: '100% Acrilico',
        weight: '100g',
        length: '340m',
      },
      {
        id: 3,
        name: 'Atlas',
        category: 'Lanas clásica',
        price: 13430,
        color: '41 colores',
        fiber: '100% Acrilico',
        weight: '100g',
        length: '130m',
      },
    ];

    // Aplicar filtros
    let filtered = products;

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar paginación
    const paginated = filtered.slice(offset, offset + limit);

    return json({
      success: true,
      data: paginated,
      pagination: {
        total: filtered.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return json(
      {
        success: false,
        error: 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}
