import { generateEmbedding, generateResponse, buildProductText } from './geminiService.js';
import { searchProductsBySimilarity, getProductBySku, createQuoteOrder } from './dbService.js';
import { analyzeIntent, extractQuoteInfo } from '../utils/intentAnalyzer.js';

/**
 * Servicio principal del chatbot - Implementa el pipeline RAG
 */

// Prompt del sistema para el chatbot
const SYSTEM_PROMPT = `Eres un asistente virtual especializado en productos de control de acceso, biometría y seguridad para el sector B2B (mayorista).

Tu empresa es similar a SIASA, un mayorista de tecnología que vende a integradores y distribuidores.

DIRECTRICES:
1. Usa un tono profesional y técnico, pero amigable
2. Siempre menciona SKU, marca y características técnicas relevantes
3. Si recomiendas productos, explica por qué son adecuados para la necesidad del cliente
4. Si un producto no está en stock o no existe, sé honesto
5. Para cotizaciones, proporciona información clara de precios y disponibilidad
6. Recuerda que tus clientes son profesionales del sector (integradores, no usuarios finales)`;

/**
 * Procesa un mensaje del usuario y genera una respuesta
 * @param {string} userId - UUID del usuario
 * @param {string} message - Mensaje del usuario
 * @returns {Promise<Object>} - { response, products?, quote? }
 */
export async function processMessage(userId, message) {
    try {
        // 1. Analizar la intención del usuario
        const { intent } = analyzeIntent(message);

        console.log(`Intención detectada: ${intent}`);

        // 2. Procesar según la intención
        if (intent === 'quote_request') {
            return await handleQuoteRequest(userId, message);
        } else {
            // Para consultas técnicas, búsquedas de productos y consultas generales
            return await handleRAGQuery(userId, message);
        }
    } catch (error) {
        console.error('Error al procesar mensaje:', error.message);
        throw error;
    }
}

/**
 * Maneja consultas usando el pipeline RAG
 * @param {string} userId - UUID del usuario
 * @param {string} message - Mensaje del usuario
 * @returns {Promise<Object>}
 */
async function handleRAGQuery(userId, message) {
    try {
        // PASO 1: Generar embedding del mensaje del usuario
        console.log('Generando embedding del mensaje...');
        const queryEmbedding = await generateEmbedding(message);

        // PASO 2: Búsqueda semántica en la base de datos
        console.log('Buscando productos similares...');
        const maxResults = parseInt(process.env.MAX_PRODUCTS_SEARCH || '5');
        const similarProducts = await searchProductsBySimilarity(queryEmbedding, maxResults);

        // PASO 3: Construir contexto con los productos encontrados
        const context = buildContext(similarProducts);

        // PASO 4: Generar respuesta usando Gemini
        console.log('Generando respuesta con IA...');
        const response = await generateResponse(SYSTEM_PROMPT, context, message);

        return {
            response,
            products: similarProducts.map(p => ({
                id: p.id,
                sku: p.sku,
                nombre: p.nombre,
                marca: p.marca,
                precio: p.precio_lista,
                stock: p.stock_actual,
                distancia: p.distancia
            }))
        };
    } catch (error) {
        console.error('Error en pipeline RAG:', error.message);
        throw error;
    }
}

/**
 * Maneja solicitudes de cotización
 * @param {string} userId - UUID del usuario
 * @param {string} message - Mensaje del usuario
 * @returns {Promise<Object>}
 */
async function handleQuoteRequest(userId, message) {
    try {
        // Extraer información de productos y cantidades
        const items = extractQuoteInfo(message);

        if (items.length === 0) {
            return {
                response: 'No pude identificar qué productos deseas cotizar. Por favor, especifica el producto y la cantidad. Ejemplo: "Cotízame 10 tarjetas HID ProxCard II"'
            };
        }

        // Buscar productos en la base de datos
        const quoteItems = [];
        let responseText = '📋 **COTIZACIÓN**\n\n';

        for (const item of items) {
            // Generar embedding del hint del producto
            const embedding = await generateEmbedding(item.productHint);
            const products = await searchProductsBySimilarity(embedding, 1);

            if (products.length > 0) {
                const product = products[0];

                // Verificar stock
                if (product.stock_actual < item.quantity) {
                    responseText += `⚠️ **${product.nombre}** (SKU: ${product.sku})\n`;
                    responseText += `   Stock insuficiente. Disponible: ${product.stock_actual}, Solicitado: ${item.quantity}\n\n`;
                } else {
                    const subtotal = product.precio_lista * item.quantity;
                    quoteItems.push({
                        productId: product.id,
                        quantity: item.quantity,
                        unitPrice: product.precio_lista,
                        product: product
                    });

                    responseText += `✓ **${product.nombre}** (SKU: ${product.sku})\n`;
                    responseText += `   Marca: ${product.marca}\n`;
                    responseText += `   Cantidad: ${item.quantity}\n`;
                    responseText += `   Precio unitario: $${product.precio_lista.toFixed(2)}\n`;
                    responseText += `   Subtotal: $${subtotal.toFixed(2)}\n\n`;
                }
            } else {
                responseText += `❌ No encontré productos que coincidan con: "${item.productHint}"\n\n`;
            }
        }

        // Si hay items válidos, crear la orden de cotización
        if (quoteItems.length > 0) {
            const total = quoteItems.reduce((sum, item) => {
                return sum + (item.quantity * item.unitPrice);
            }, 0);

            responseText += `**TOTAL: $${total.toFixed(2)}**\n\n`;

            // Crear orden en la base de datos
            const order = await createQuoteOrder(
                userId,
                quoteItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            );

            responseText += `Cotización guardada con ID: ${order.id}\n`;
            responseText += `Para proceder con el pedido, contacta a tu ejecutivo de cuenta.`;

            return {
                response: responseText,
                quote: {
                    orderId: order.id,
                    items: quoteItems.map(item => ({
                        sku: item.product.sku,
                        nombre: item.product.nombre,
                        cantidad: item.quantity,
                        precioUnitario: item.unitPrice,
                        subtotal: item.quantity * item.unitPrice
                    })),
                    total
                }
            };
        } else {
            responseText += 'No se pudo generar la cotización. Por favor, verifica los productos solicitados.';
            return { response: responseText };
        }
    } catch (error) {
        console.error('Error al procesar cotización:', error.message);
        throw error;
    }
}

/**
 * Construye el contexto de productos para el prompt
 * @param {Array} products - Array de productos
 * @returns {string} - Contexto formateado
 */
function buildContext(products) {
    if (products.length === 0) {
        return 'No se encontraron productos relevantes en el catálogo.';
    }

    return products.map((p, index) => {
        const specs = p.especificaciones_tecnicas || {};
        const specsText = Object.entries(specs)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return `  - ${key}: ${value.join(', ')}`;
                }
                return `  - ${key}: ${value}`;
            })
            .join('\n');

        return `
PRODUCTO ${index + 1}:
- SKU: ${p.sku}
- Nombre: ${p.nombre}
- Marca: ${p.marca}
- Descripción: ${p.descripcion}
- Precio: $${p.precio_lista}
- Stock: ${p.stock_actual} unidades
- Especificaciones:
${specsText}
- Relevancia: ${(1 - p.distancia).toFixed(2)}
`;
    }).join('\n---\n');
}

export default {
    processMessage
};
