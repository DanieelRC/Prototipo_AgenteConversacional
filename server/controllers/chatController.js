import { processMessage } from '../services/chatService.js';

/**
 * Controlador para endpoints de chat
 */

/**
 * POST /api/chat/message
 * Procesa un mensaje del usuario y devuelve la respuesta del chatbot
 */
export async function sendMessage(req, res, next) {
    try {
        const { userId, message } = req.body;

        // Validar datos de entrada
        if (!userId) {
            return res.status(400).json({
                error: 'El campo userId es requerido'
            });
        }

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'El campo message es requerido y debe ser un texto válido'
            });
        }

        // Procesar el mensaje usando el servicio de chat
        console.log(`[Chat] Usuario ${userId}: ${message}`);
        const result = await processMessage(userId, message.trim());

        // Devolver respuesta
        res.status(200).json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Error en sendMessage:', error.message);
        next(error);
    }
}

export default {
    sendMessage
};
