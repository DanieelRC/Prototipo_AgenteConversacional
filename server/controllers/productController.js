import { generateEmbedding, buildProductText } from '../services/geminiService.js';
import { saveProductWithEmbedding } from '../services/dbService.js';

/**
 * Controlador para endpoints de productos
 */

/**
 * POST /api/products/sync
 * Sincroniza un producto generando su embedding y guardándolo en la BD
 */
export async function syncProduct(req, res, next) {
    try {
        const productData = req.body;

        // Validar datos mínimos requeridos
        if (!productData.sku || !productData.nombre || !productData.precio_lista) {
            return res.status(400).json({
                error: 'Los campos sku, nombre y precio_lista son requeridos'
            });
        }

        console.log(`[Sync] Sincronizando producto: ${productData.nombre}`);

        // Construir texto descriptivo del producto
        const productText = buildProductText(productData);
        console.log(`[Sync] Texto generado: ${productText.substring(0, 100)}...`);

        // Generar embedding
        console.log('[Sync] Generando embedding...');
        const embedding = await generateEmbedding(productText);

        // Guardar en la base de datos
        console.log('[Sync] Guardando en base de datos...');
        const savedProduct = await saveProductWithEmbedding(productData, embedding);

        res.status(201).json({
            success: true,
            message: 'Producto sincronizado exitosamente',
            product: savedProduct
        });

    } catch (error) {
        console.error('Error en syncProduct:', error.message);

        // Si es error de duplicado de SKU
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
            return res.status(409).json({
                error: 'Ya existe un producto con ese SKU'
            });
        }

        next(error);
    }
}

export default {
    syncProduct
};
