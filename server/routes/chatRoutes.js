import express from 'express';
import { sendMessage } from '../controllers/chatController.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Envía un mensaje al chatbot y recibe una respuesta
 * 
 * Body:
 * {
 *   "userId": "uuid-del-usuario",
 *   "message": "texto del mensaje"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "response": "respuesta del bot",
 *   "products": [...],  // opcional
 *   "quote": {...}      // opcional
 * }
 */
router.post('/message', sendMessage);

export default router;
