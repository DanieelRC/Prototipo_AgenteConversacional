import sql from '../config/database.js';

/**
 * Servicio para operaciones de base de datos con Neon
 */

/**
 * Busca productos por similitud semántica usando pgvector
 * @param {number[]} embedding - Vector de embedding del query
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<Array>} - Array de productos similares
 */
export async function searchProductsBySimilarity(embedding, limit = 5) {
    try {
        // Convertir el array de números a formato vector de PostgreSQL
        const vectorString = `[${embedding.join(',')}]`;

        // Query con búsqueda por distancia de coseno
        // El operador <=> calcula la distancia de coseno (menor = más similar)
        const result = await sql`
      SELECT 
        id,
        sku,
        nombre,
        marca,
        descripcion,
        precio_lista,
        stock_actual,
        especificaciones_tecnicas,
        (embedding <=> ${vectorString}::vector) AS distancia
      FROM productos
      WHERE es_activo = true
        AND stock_actual > 0
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

        return result;
    } catch (error) {
        console.error('Error en búsqueda semántica:', error.message);
        throw new Error(`Error al buscar productos: ${error.message}`);
    }
}

/**
 * Obtiene un producto por SKU
 * @param {string} sku - SKU del producto
 * @returns {Promise<Object|null>} - Producto o null si no existe
 */
export async function getProductBySku(sku) {
    try {
        const result = await sql`
      SELECT 
        id,
        sku,
        nombre,
        marca,
        descripcion,
        precio_lista,
        stock_actual,
        especificaciones_tecnicas
      FROM productos
      WHERE sku = ${sku} AND es_activo = true
    `;

        return result[0] || null;
    } catch (error) {
        console.error('Error al obtener producto por SKU:', error.message);
        throw error;
    }
}

/**
 * Verifica el stock disponible de un producto
 * @param {number} productId - ID del producto
 * @returns {Promise<number>} - Cantidad en stock
 */
export async function checkStock(productId) {
    try {
        const result = await sql`
      SELECT stock_actual 
      FROM productos 
      WHERE id = ${productId}
    `;

        if (result.length === 0) {
            throw new Error('Producto no encontrado');
        }

        return result[0].stock_actual;
    } catch (error) {
        console.error('Error al verificar stock:', error.message);
        throw error;
    }
}

/**
 * Crea una orden de cotización
 * @param {string} userId - UUID del usuario
 * @param {Array} items - Array de items: [{productId, quantity, unitPrice}]
 * @returns {Promise<Object>} - Orden creada
 */
export async function createQuoteOrder(userId, items) {
    try {
        // Calcular monto total
        const montoTotal = items.reduce((sum, item) => {
            return sum + (item.quantity * item.unitPrice);
        }, 0);

        // Crear la orden
        const orderResult = await sql`
      INSERT INTO ordenes (usuario_id, monto_total, estado)
      VALUES (${userId}, ${montoTotal}, 'cotizacion')
      RETURNING id, usuario_id, monto_total, estado, fecha_creacion
    `;

        const order = orderResult[0];

        // Insertar detalles de la orden
        for (const item of items) {
            await sql`
        INSERT INTO detalles_orden (orden_id, producto_id, cantidad, precio_unitario)
        VALUES (${order.id}, ${item.productId}, ${item.quantity}, ${item.unitPrice})
      `;
        }

        return {
            ...order,
            items
        };
    } catch (error) {
        console.error('Error al crear orden de cotización:', error.message);
        throw error;
    }
}

/**
 * Guarda un producto con su embedding en la base de datos
 * @param {Object} productData - Datos del producto
 * @param {number[]} embedding - Vector de embedding
 * @returns {Promise<Object>} - Producto guardado
 */
export async function saveProductWithEmbedding(productData, embedding) {
    try {
        const vectorString = `[${embedding.join(',')}]`;
        const especificacionesJson = JSON.stringify(productData.especificaciones_tecnicas);

        const result = await sql`
      INSERT INTO productos (
        categoria_id, sku, nombre, marca, descripcion,
        precio_lista, stock_actual, unidad_medida,
        especificaciones_tecnicas, embedding
      )
      VALUES (
        ${productData.categoria_id},
        ${productData.sku},
        ${productData.nombre},
        ${productData.marca},
        ${productData.descripcion},
        ${productData.precio_lista},
        ${productData.stock_actual},
        ${productData.unidad_medida || 'pieza'},
        ${especificacionesJson}::jsonb,
        ${vectorString}::vector
      )
      RETURNING id, sku, nombre, marca, precio_lista, stock_actual
    `;

        return result[0];
    } catch (error) {
        console.error('Error al guardar producto:', error.message);
        throw error;
    }
}

export default {
    searchProductsBySimilarity,
    getProductBySku,
    checkStock,
    createQuoteOrder,
    saveProductWithEmbedding
};
