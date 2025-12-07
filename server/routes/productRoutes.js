import express from 'express';
import { syncProduct } from '../controllers/productController.js';
import { updateProductEmbedding } from '../controllers/updateEmbeddingController.js';

const router = express.Router();

/**
 * POST /api/products/sync
 * Sincroniza un producto generando su embedding
 */
router.post('/sync', syncProduct);

/**
 * POST /api/products/update-embedding
 * Actualiza el embedding de un producto existente
 */
router.post('/update-embedding', async (req, res, next) => {
    try {
        const { sku, embedding } = req.body;

        if (!sku || !embedding) {
            return res.status(400).json({
                error: 'Los campos sku y embedding son requeridos'
            });
        }

        const result = await updateProductEmbedding(sku, embedding);

        res.status(200).json({
            success: true,
            message: 'Embedding actualizado exitosamente',
            product: result
        });
    } catch (error) {
        next(error);
    }
});

export default router;
