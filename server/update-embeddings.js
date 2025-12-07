/**
 * Script para ACTUALIZAR embeddings de productos existentes
 * Este script actualiza los embeddings sin intentar crear productos nuevos
 */

const productos = [
    {
        sku: "SUP-BS2-OEPW",
        nombre: "BioStation 2 Lector de Huella Exterior",
        marca: "Suprema",
        descripcion: "Terminal biométrica IP para control de acceso y asistencia. Ultra rápido y apto para exterior.",
        especificaciones_tecnicas: {
            tipo_sensor: "Optico OP5",
            capacidad_usuarios: 500000,
            conectividad: ["TCP/IP", "WiFi", "RS485"],
            proteccion_ip: "IP65 (Exterior)",
            poe: true
        }
    },
    {
        sku: "HID-1326-LMSMV",
        nombre: "Tarjeta Clamshell ProxCard II",
        marca: "HID Global",
        descripcion: "Tarjeta de control de acceso de proximidad estándar. Durable y económica.",
        especificaciones_tecnicas: {
            frecuencia: "125 kHz",
            material: "ABS",
            formato: "26 bits Wiegand",
            rango_lectura: "Hasta 60 cm",
            imprimible: false
        }
    },
    {
        sku: "FAR-DTC1250E",
        nombre: "Impresora Fargo DTC1250e Doble Cara",
        marca: "HID Fargo",
        descripcion: "La solución ideal de impresión de tarjetas para pequeñas empresas, escuelas y gobiernos locales.",
        especificaciones_tecnicas: {
            tecnologia: "Sublimación de tinta",
            resolucion: "300 dpi",
            velocidad: "16 segundos por tarjeta a color",
            interfaz: "USB 2.0",
            laminacion: false
        }
    },
    {
        sku: "SIA-CETNET-500",
        nombre: "Licencia Software CET.NET Edición Professional",
        marca: "SIASA",
        descripcion: "Software administrativo para control de asistencia, incidencias y nómina. Versión hasta 500 empleados.",
        especificaciones_tecnicas: {
            compatibilidad_os: ["Windows 10", "Windows 11", "Server 2019"],
            base_datos: ["SQL Server", "Firebird"],
            modulos: ["Nómina", "Horarios Rotativos", "Vacaciones"],
            tipo_licencia: "Digital / Perpetua"
        }
    },
    {
        sku: "ZK-TS2000",
        nombre: "Torniquete Trípode TS2000 Pro",
        marca: "ZKTeco",
        descripcion: "Torniquete trípode de acero inoxidable con función de caída de brazo para emergencias.",
        especificaciones_tecnicas: {
            material: "Acero Inoxidable SUS304",
            flujo_personas: "30 por minuto",
            alimentacion: "110V/220V AC",
            uso: "Interior / Exterior protegido",
            mecanismo: "Semi-automático"
        }
    }
];

// Función para construir texto descriptivo del producto
function buildProductText(product) {
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

// Función para generar embedding
async function generateEmbedding(text) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=' + process.env.GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: {
                parts: [{ text: text }]
            }
        })
    });

    const data = await response.json();
    return data.embedding.values;
}

// Función para actualizar embedding en la BD
async function updateEmbedding(sku, embedding) {
    const vectorString = `[${embedding.join(',')}]`;

    const response = await fetch('http://localhost:3000/api/products/update-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sku: sku,
            embedding: vectorString
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar');
    }

    return await response.json();
}

async function updateProductos() {
    console.log('🚀 Iniciando actualización de embeddings...\n');

    // Verificar que GEMINI_API_KEY esté configurada
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY no está configurada');
        console.log('   Asegúrate de tener un archivo .env con tu API key de Gemini');
        return;
    }

    for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];
        console.log(`[${i + 1}/${productos.length}] Actualizando: ${producto.nombre}`);
        console.log(`   SKU: ${producto.sku}`);

        try {
            // 1. Construir texto descriptivo
            const productText = buildProductText(producto);
            console.log(`   📝 Texto: ${productText.substring(0, 80)}...`);

            // 2. Generar embedding con Gemini
            console.log(`   🤖 Generando embedding...`);
            const embedding = await generateEmbedding(productText);
            console.log(`   ✓ Embedding generado: ${embedding.length} dimensiones`);

            // 3. Actualizar en la BD
            console.log(`   💾 Actualizando en base de datos...`);
            await updateEmbedding(producto.sku, embedding);
            console.log(`   ✅ Actualizado exitosamente\n`);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }

        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✨ Actualización completada!');
}

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

// Ejecutar
updateProductos().catch(console.error);
