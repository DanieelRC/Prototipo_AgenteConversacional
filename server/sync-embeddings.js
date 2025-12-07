/**
 * Script para sincronizar embeddings de productos existentes
 * Este script regenera los embeddings usando Gemini API
 */

const productos = [
    {
        categoria_id: 1,
        sku: "SUP-BS2-OEPW",
        nombre: "BioStation 2 Lector de Huella Exterior",
        marca: "Suprema",
        descripcion: "Terminal biométrica IP para control de acceso y asistencia. Ultra rápido y apto para exterior.",
        precio_lista: 15500.00,
        stock_actual: 45,
        unidad_medida: "pieza",
        especificaciones_tecnicas: {
            tipo_sensor: "Optico OP5",
            capacidad_usuarios: 500000,
            conectividad: ["TCP/IP", "WiFi", "RS485"],
            proteccion_ip: "IP65 (Exterior)",
            poe: true
        }
    },
    {
        categoria_id: 2,
        sku: "HID-1326-LMSMV",
        nombre: "Tarjeta Clamshell ProxCard II",
        marca: "HID Global",
        descripcion: "Tarjeta de control de acceso de proximidad estándar. Durable y económica.",
        precio_lista: 65.50,
        stock_actual: 5000,
        unidad_medida: "pieza",
        especificaciones_tecnicas: {
            frecuencia: "125 kHz",
            material: "ABS",
            formato: "26 bits Wiegand",
            rango_lectura: "Hasta 60 cm",
            imprimible: false
        }
    },
    {
        categoria_id: 2,
        sku: "FAR-DTC1250E",
        nombre: "Impresora Fargo DTC1250e Doble Cara",
        marca: "HID Fargo",
        descripcion: "La solución ideal de impresión de tarjetas para pequeñas empresas, escuelas y gobiernos locales.",
        precio_lista: 28900.00,
        stock_actual: 12,
        unidad_medida: "pieza",
        especificaciones_tecnicas: {
            tecnologia: "Sublimación de tinta",
            resolucion: "300 dpi",
            velocidad: "16 segundos por tarjeta a color",
            interfaz: "USB 2.0",
            laminacion: false
        }
    },
    {
        categoria_id: 3,
        sku: "SIA-CETNET-500",
        nombre: "Licencia Software CET.NET Edición Professional",
        marca: "SIASA",
        descripcion: "Software administrativo para control de asistencia, incidencias y nómina. Versión hasta 500 empleados.",
        precio_lista: 8500.00,
        stock_actual: 999,
        unidad_medida: "licencia",
        especificaciones_tecnicas: {
            compatibilidad_os: ["Windows 10", "Windows 11", "Server 2019"],
            base_datos: ["SQL Server", "Firebird"],
            modulos: ["Nómina", "Horarios Rotativos", "Vacaciones"],
            tipo_licencia: "Digital / Perpetua"
        }
    },
    {
        categoria_id: 1,
        sku: "ZK-TS2000",
        nombre: "Torniquete Trípode TS2000 Pro",
        marca: "ZKTeco",
        descripcion: "Torniquete trípode de acero inoxidable con función de caída de brazo para emergencias.",
        precio_lista: 12400.00,
        stock_actual: 8,
        unidad_medida: "pieza",
        especificaciones_tecnicas: {
            material: "Acero Inoxidable SUS304",
            flujo_personas: "30 por minuto",
            alimentacion: "110V/220V AC",
            uso: "Interior / Exterior protegido",
            mecanismo: "Semi-automático"
        }
    }
];

async function syncProductos() {
    const baseURL = 'http://localhost:3000';

    console.log('🚀 Iniciando sincronización de embeddings...\n');

    for (let i = 0; i < productos.length; i++) {
        const producto = productos[i];
        console.log(`[${i + 1}/${productos.length}] Sincronizando: ${producto.nombre}`);
        console.log(`   SKU: ${producto.sku}`);

        try {
            const response = await fetch(`${baseURL}/api/products/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(producto)
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`   ✅ Sincronizado exitosamente`);
            } else {
                const error = await response.json();
                console.log(`   ❌ Error: ${error.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Error de conexión: ${error.message}`);
        }

        console.log('');

        // Pequeña pausa para no saturar la API de Gemini
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✨ Sincronización completada!');
}

// Ejecutar
syncProductos().catch(console.error);
