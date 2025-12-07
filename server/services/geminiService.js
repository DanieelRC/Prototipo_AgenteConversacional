import { chatModel, embeddingModel } from '../config/gemini.js';

/**
 * Servicio para interactuar con Google Gemini API
 */

/**
 * Genera un embedding (vector) para un texto dado
 * @param {string} text - Texto a convertir en embedding
 * @returns {Promise<number[]>} - Vector de 1536 dimensiones
 */
export async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        const embedding = result.embedding;

        if (!embedding || !embedding.values) {
            throw new Error('El embedding generado está vacío');
        }

        console.log(`  Embedding generado: ${embedding.values.length} dimensiones`);

        return embedding.values;
    } catch (error) {
        console.error('Error al generar embedding:', error.message);
        throw new Error(`Error en Gemini API (embedding): ${error.message}`);
    }
}

/**
 * Genera una respuesta de texto usando el modelo de chat
 * @param {string} systemPrompt - Instrucciones del sistema
 * @param {string} context - Contexto recuperado de la base de datos
 * @param {string} userMessage - Mensaje del usuario
 * @returns {Promise<string>} - Respuesta generada
 */
export async function generateResponse(systemPrompt, context, userMessage) {
    try {
        // Construir el prompt completo
        const fullPrompt = `${systemPrompt}

CONTEXTO DE PRODUCTOS:
${context}

PREGUNTA DEL USUARIO:
${userMessage}

INSTRUCCIONES:
- Responde de manera profesional y técnica
- Si recomiendas productos, menciona SKU, marca y características clave
- Si no hay productos relevantes en el contexto, indícalo claramente
- Mantén un tono B2B (mayorista)`;

        const result = await chatModel.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        if (!text) {
            throw new Error('La respuesta de Gemini está vacía');
        }

        return text;
    } catch (error) {
        console.error('Error al generar respuesta:', error.message);
        throw new Error(`Error en Gemini API (generación): ${error.message}`);
    }
}

/**
 * Genera un texto descriptivo completo de un producto para crear su embedding
 * @param {Object} product - Objeto del producto
 * @returns {string} - Texto descriptivo
 */
export function buildProductText(product) {
    const specs = product.especificaciones_tecnicas || {};
    const specsText = Object.entries(specs)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
            }
            return `${key}: ${value}`;
        })
        .join('. ');

    return `${product.nombre}. Marca: ${product.marca}. ${product.descripcion}. Especificaciones: ${specsText}`;
}

export default {
    generateEmbedding,
    generateResponse,
    buildProductText
};
