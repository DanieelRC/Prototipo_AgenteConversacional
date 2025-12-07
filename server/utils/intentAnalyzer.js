/**
 * Utilidad para analizar la intención del usuario
 */

// Patrones para detectar solicitudes de cotización
const QUOTE_PATTERNS = [
    /cotiza(me|r)?/i,
    /cu[aá]nto (cuesta|costar[ií]a)/i,
    /precio de/i,
    /quiero comprar/i,
    /necesito \d+/i,
    /dame \d+/i,
    /\d+\s*(piezas|unidades|licencias)/i
];

// Patrones para detectar consultas técnicas
const TECHNICAL_PATTERNS = [
    /especificaciones/i,
    /caracter[ií]sticas/i,
    /c[oó]mo funciona/i,
    /qu[eé] (es|son)/i,
    /para qu[eé] sirve/i,
    /compatib(le|ilidad)/i,
    /conectividad/i,
    /capacidad/i,
    /rendimiento/i
];

// Patrones para detectar búsqueda de productos
const PRODUCT_SEARCH_PATTERNS = [
    /necesito (un|una)/i,
    /busco (un|una)/i,
    /recomienda(me)?/i,
    /qu[eé] productos/i,
    /tienes? (algo|alguno)/i,
    /para (uso|exterior|interior)/i,
    /(lector|impresora|tarjeta|software|torniquete)/i
];

/**
 * Analiza la intención del mensaje del usuario
 * @param {string} message - Mensaje del usuario
 * @returns {Object} - { intent: string, confidence: number }
 */
export function analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Verificar si es solicitud de cotización
    const isQuote = QUOTE_PATTERNS.some(pattern => pattern.test(message));
    if (isQuote) {
        return { intent: 'quote_request', confidence: 0.9 };
    }

    // Verificar si es consulta técnica
    const isTechnical = TECHNICAL_PATTERNS.some(pattern => pattern.test(message));
    if (isTechnical) {
        return { intent: 'technical_query', confidence: 0.85 };
    }

    // Verificar si es búsqueda de producto
    const isProductSearch = PRODUCT_SEARCH_PATTERNS.some(pattern => pattern.test(message));
    if (isProductSearch) {
        return { intent: 'product_search', confidence: 0.8 };
    }

    // Por defecto, asumir que es una consulta general
    return { intent: 'general_query', confidence: 0.5 };
}

/**
 * Extrae información de productos y cantidades de un mensaje de cotización
 * @param {string} message - Mensaje del usuario
 * @returns {Array} - Array de { productHint: string, quantity: number }
 */
export function extractQuoteInfo(message) {
    const items = [];

    // Buscar patrones como "10 tarjetas HID" o "5 lectores biométricos"
    const quantityPattern = /(\d+)\s+([a-záéíóúñ\s]+?)(?:\s|$|,|\.)/gi;
    let match;

    while ((match = quantityPattern.exec(message)) !== null) {
        const quantity = parseInt(match[1]);
        const productHint = match[2].trim();

        if (quantity > 0 && productHint.length > 2) {
            items.push({ productHint, quantity });
        }
    }

    // Si no se encontró cantidad, buscar solo nombres de productos
    if (items.length === 0) {
        const productPattern = /(lector|impresora|tarjeta|software|torniquete|biométrico|credencial)/gi;
        const matches = message.match(productPattern);

        if (matches) {
            items.push({ productHint: matches[0], quantity: 1 });
        }
    }

    return items;
}

export default {
    analyzeIntent,
    extractQuoteInfo
};
