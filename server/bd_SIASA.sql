
-- 1. Habilitar extensiones (Vectores para IA y UUIDs)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Usuarios (Distribuidores / Integradores)
-- En un modelo mayorista como SIASA, el usuario suele ser un integrador o distribuidor.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo VARCHAR(100),
    nombre_empresa VARCHAR(150), -- Importante para B2B
    rfc_o_tax_id VARCHAR(50),    -- Identificación fiscal
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    -- Preferencias: Marcas favoritas (HID, Suprema, etc), categorías de interés
    preferencias JSONB 
);

-- 3. Categorías (Ej: Control de Acceso, CCTV, Biometría)
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL, -- Ej: "Relojes Checadores", "Tarjetas PVC"
    descripcion TEXT,
    categoria_padre_id INT REFERENCES categorias(id) -- Para subcategorías (Ej: Biometría -> Facial)
);

-- 4. Tabla de Productos (Hardware y Software Especializado)
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES categorias(id),
    sku VARCHAR(50) UNIQUE NOT NULL, -- Código único de producto (Vital en almacén)
    nombre VARCHAR(200) NOT NULL,    -- Ej: "Lector Biométrico FaceStation 2"
    marca VARCHAR(50),               -- Ej: "Suprema", "HID", "ZKTeco"
    descripcion TEXT,
    precio_lista DECIMAL(10, 2) NOT NULL,
    stock_actual INT DEFAULT 0,
    nivel_reorden INT DEFAULT 5,     -- Alerta cuando el stock baja de este número
    unidad_medida VARCHAR(20) DEFAULT 'pieza', -- pieza, caja, licencia, bobina
    imagen_url TEXT,
    es_activo BOOLEAN DEFAULT TRUE,
    
    -- DATOS TÉCNICOS (JSONB):
    -- Aquí guardas atributos variables sin crear 100 columnas. Ejemplos:
    -- {"tipo_biometria": "facial", "conectividad": ["TCP/IP", "Wiegand"], "uso": "exterior"}
    -- {"tipo_tarjeta": "Mifare 13.56Mhz", "material": "PVC"}
    especificaciones_tecnicas JSONB,

    -- VECTOR DE IA:
    -- Representación semántica de todas las características técnicas para el chatbot.
    embedding vector(1536), 
    
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Órdenes (Pedidos de Distribuidores)
CREATE TABLE ordenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    monto_total DECIMAL(12, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, procesando, enviado, facturado
    metodo_envio VARCHAR(50), -- Ej: "Recolección en tienda", "Paquetería"
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Detalles de la Orden
CREATE TABLE detalles_orden (
    id SERIAL PRIMARY KEY,
    orden_id UUID REFERENCES ordenes(id),
    producto_id INT REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL
);

-- 7. Historial de Conversaciones (Contexto Técnico del Chatbot)
CREATE TABLE conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    inicio_chat TIMESTAMPTZ DEFAULT NOW(),
    ultimo_mensaje TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Mensajes (Soporte Técnico y Ventas)
CREATE TABLE mensajes (
    id SERIAL PRIMARY KEY,
    conversacion_id UUID REFERENCES conversaciones(id),
    rol VARCHAR(20) NOT NULL, -- 'user' (usuario), 'assistant' (chatbot), 'system' (sistema)
    contenido TEXT NOT NULL,
    tokens_usados INT,
    fecha_envio TIMESTAMPTZ DEFAULT NOW()
);

-- --- ÍNDICES PARA RENDIMIENTO ---

-- Índice HNSW para búsqueda semántica rápida en catálogo técnico
CREATE INDEX ON productos USING hnsw (embedding vector_cosine_ops);

-- Índices Gin para buscar rápido dentro del JSONB de especificaciones
-- Esto permite queries como: "Dames todos los productos que tengan conectividad Wiegand"
CREATE INDEX idx_productos_specs ON productos USING gin (especificaciones_tecnicas);

CREATE INDEX idx_productos_marca ON productos(marca);
CREATE INDEX idx_productos_sku ON productos(sku);

-- 1. Insertar Categorías (necesarias para relacionar los productos)
INSERT INTO categorias (nombre, descripcion) VALUES
('Biometría y Control de Acceso', 'Lectores de huella, faciales y paneles de control'),
('Identificación Digital', 'Impresoras de tarjetas, consumibles y tarjetas PVC'),
('Software', 'Soluciones de gestión de tiempo, asistencia y control de acceso')
ON CONFLICT DO NOTHING;

-- 2. Insertar 1 Proveedor/Integrador Ficticio
INSERT INTO usuarios (
    nombre_completo, 
    nombre_empresa, 
    rfc_o_tax_id, 
    email, 
    telefono, 
    preferencias
) VALUES (
    'Roberto ''Ingeniero'' Gómez', 
    'Seguridad Integral del Norte S.A. de C.V.', 
    'SIN800101XYZ', 
    'compras@seguridadnorte.mx', 
    '+52 55 1234 5678', 
    '{
        "marcas_preferidas": ["Suprema", "HID", "Fargo"],
        "nivel_distribuidor": "Gold",
        "metodo_pago_habitual": "Crédito 30 días"
    }'::jsonb
);

-- 3. Insertar 5 Productos (Simulando el catálogo de SIASA)

-- Producto 1: Lector Biométrico de Alto Rendimiento
INSERT INTO productos (
    categoria_id, sku, nombre, marca, descripcion, precio_lista, stock_actual, unidad_medida, especificaciones_tecnicas, embedding
) VALUES (
    (SELECT id FROM categorias WHERE nombre = 'Biometría y Control de Acceso'),
    'SUP-BS2-OEPW', 
    'BioStation 2 Lector de Huella Exterior', 
    'Suprema', 
    'Terminal biométrica IP para control de acceso y asistencia. Ultra rápido y apto para exterior.', 
    15500.00, 
    45, 
    'pieza', 
    '{
        "tipo_sensor": "Optico OP5", 
        "capacidad_usuarios": 500000, 
        "conectividad": ["TCP/IP", "WiFi", "RS485"], 
        "proteccion_ip": "IP65 (Exterior)",
        "poe": true
    }'::jsonb,
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536)) -- Vector Simulado
);

-- Producto 2: Tarjetas de Proximidad (Consumible masivo)
INSERT INTO productos (
    categoria_id, sku, nombre, marca, descripcion, precio_lista, stock_actual, unidad_medida, especificaciones_tecnicas, embedding
) VALUES (
    (SELECT id FROM categorias WHERE nombre = 'Identificación Digital'),
    'HID-1326-LMSMV', 
    'Tarjeta Clamshell ProxCard II', 
    'HID Global', 
    'Tarjeta de control de acceso de proximidad estándar. Durable y económica.', 
    65.50, 
    5000, 
    'pieza', 
    '{
        "frecuencia": "125 kHz", 
        "material": "ABS", 
        "formato": "26 bits Wiegand", 
        "rango_lectura": "Hasta 60 cm",
        "imprimible": false
    }'::jsonb,
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536))
);

-- Producto 3: Impresora de Credenciales
INSERT INTO productos (
    categoria_id, sku, nombre, marca, descripcion, precio_lista, stock_actual, unidad_medida, especificaciones_tecnicas, embedding
) VALUES (
    (SELECT id FROM categorias WHERE nombre = 'Identificación Digital'),
    'FAR-DTC1250E', 
    'Impresora Fargo DTC1250e Doble Cara', 
    'HID Fargo', 
    'La solución ideal de impresión de tarjetas para pequeñas empresas, escuelas y gobiernos locales.', 
    28900.00, 
    12, 
    'pieza', 
    '{
        "tecnologia": "Sublimación de tinta", 
        "resolucion": "300 dpi", 
        "velocidad": "16 segundos por tarjeta a color", 
        "interfaz": "USB 2.0",
        "laminacion": false
    }'::jsonb,
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536))
);

-- Producto 4: Software de Tiempo y Asistencia
INSERT INTO productos (
    categoria_id, sku, nombre, marca, descripcion, precio_lista, stock_actual, unidad_medida, especificaciones_tecnicas, embedding
) VALUES (
    (SELECT id FROM categorias WHERE nombre = 'Software'),
    'SIA-CETNET-500', 
    'Licencia Software CET.NET Edición Professional', 
    'SIASA', 
    'Software administrativo para control de asistencia, incidencias y nómina. Versión hasta 500 empleados.', 
    8500.00, 
    999, 
    'licencia', 
    '{
        "compatibilidad_os": ["Windows 10", "Windows 11", "Server 2019"], 
        "base_datos": ["SQL Server", "Firebird"], 
        "modulos": ["Nómina", "Horarios Rotativos", "Vacaciones"], 
        "tipo_licencia": "Digital / Perpetua"
    }'::jsonb,
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536))
);

-- Producto 5: Torniquete de Acceso (Hardware pesado)
INSERT INTO productos (
    categoria_id, sku, nombre, marca, descripcion, precio_lista, stock_actual, unidad_medida, especificaciones_tecnicas, embedding
) VALUES (
    (SELECT id FROM categorias WHERE nombre = 'Biometría y Control de Acceso'),
    'ZK-TS2000', 
    'Torniquete Trípode TS2000 Pro', 
    'ZKTeco', 
    'Torniquete trípode de acero inoxidable con función de caída de brazo para emergencias.', 
    12400.00, 
    8, 
    'pieza', 
    '{
        "material": "Acero Inoxidable SUS304", 
        "flujo_personas": "30 por minuto", 
        "alimentacion": "110V/220V AC", 
        "uso": "Interior / Exterior protegido",
        "mecanismo": "Semi-automático"
    }'::jsonb,
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536))
);
