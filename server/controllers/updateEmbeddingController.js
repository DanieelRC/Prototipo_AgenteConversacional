import sql from '../config/database.js';

/**
 * Actualiza el embedding de un producto existente
 * @param {string} sku - SKU del producto
 * @param {string} vectorString - Vector en formato string
 * @returns {Promise<Object>}
 */
export async function updateProductEmbedding(sku, vectorString) {
    try {
        const result = await sql`
      UPDATE productos
      SET embedding = ${vectorString}::vector
      WHERE sku = ${sku}
      RETURNING id, sku, nombre
    `;

        if (result.length === 0) {
            throw new Error('Producto no encontrado');
        }

        return result[0];
    } catch (error) {
        console.error('Error al actualizar embedding:', error.message);
        throw error;
    }
}

export default {
    updateProductEmbedding
};
