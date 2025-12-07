# Chatbot B2B Backend

Backend para chatbot de E-commerce B2B especializado en productos de control de acceso, biometría y seguridad. Implementa RAG (Retrieval-Augmented Generation) usando Google Gemini y PostgreSQL con pgvector.

## Arquitectura

Sistema basado en patrón MVC con pipeline RAG:

1. **Recepción**: Usuario envía mensaje
2. **Vectorización**: Generar embedding con Gemini
3. **Búsqueda**: Buscar productos similares en PostgreSQL (distancia de coseno)
4. **Generación**: Enviar contexto + pregunta a Gemini para respuesta

## Requisitos Previos

- Node.js v18 o superior
- Neon PostgreSQL (PostgreSQL Serverless) con extensión pgvector
- Google Gemini API Key ([Obtener aquí](https://makersuite.google.com/app/apikey))
- Base de datos Neon con esquema de `bd_SIASA.sql`

## Instalación

### 1. Instalar dependencias

```bash
cd server
npm install
```

### 2. Configurar variables de entorno

Edita `.env` con tus credenciales:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
GEMINI_API_KEY=tu_api_key_aqui
MAX_PRODUCTS_SEARCH=5
EMBEDDING_DIMENSION=768
```

### 3. Crear esquema en Neon

Ejecuta `bd_SIASA.sql` en la consola SQL de Neon para crear tablas e insertar datos de ejemplo.

### 4. Actualizar dimensión de vectores

Ejecuta este script SQL en Neon para ajustar la dimensión de embeddings:

```sql
DROP INDEX IF EXISTS productos_embedding_idx;
ALTER TABLE productos ALTER COLUMN embedding TYPE vector(768);
CREATE INDEX productos_embedding_idx ON productos USING hnsw (embedding vector_cosine_ops);
UPDATE productos SET embedding = NULL;
```

### 5. Sincronizar embeddings

```bash
node update-embeddings.js
```

## Ejecutar el Servidor

**Modo normal:**
```bash
npm start
```

**Modo desarrollo (auto-reload):**
```bash
npm run dev
```

El servidor iniciará en `http://localhost:3000`

## API Endpoints

### Health Check

```http
GET /health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T05:00:00.000Z",
  "service": "Chatbot B2B Backend"
}
```

### Enviar Mensaje al Chatbot

```http
POST /api/chat/message
Content-Type: application/json

{
  "userId": "uuid-del-usuario",
  "message": "Necesito un lector biométrico para uso exterior"
}
```

Respuesta para consulta técnica:
```json
{
  "success": true,
  "response": "Te recomiendo el BioStation 2...",
  "products": [
    {
      "id": 1,
      "sku": "SUP-BS2-OEPW",
      "nombre": "BioStation 2 Lector de Huella Exterior",
      "marca": "Suprema",
      "precio": 15500.00,
      "stock": 45,
      "distancia": 0.23
    }
  ]
}
```

Respuesta para cotización:
```json
{
  "success": true,
  "response": "COTIZACIÓN\n\nTarjeta Clamshell ProxCard II...",
  "quote": {
    "orderId": "uuid-de-la-orden",
    "items": [...],
    "total": 655.00
  }
}
```

### Sincronizar Producto

```http
POST /api/products/sync
Content-Type: application/json

{
  "categoria_id": 1,
  "sku": "TEST-001",
  "nombre": "Lector Biométrico de Prueba",
  "marca": "TestBrand",
  "descripcion": "Lector biométrico con sensor óptico",
  "precio_lista": 1000.00,
  "stock_actual": 10,
  "especificaciones_tecnicas": {
    "tipo_sensor": "Óptico",
    "conectividad": ["TCP/IP", "USB"]
  }
}
```


### Pruebas

```powershell
# Health Check
curl http://localhost:3000/health

# Consulta al chatbot
$body = @{
    userId = "550e8400-e29b-41d4-a716-446655440000"
    message = "Necesito un lector biométrico para exterior"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/chat/message" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

## Estructura del Proyecto

```
server/
├── config/
│   ├── database.js          # Cliente Neon PostgreSQL
│   └── gemini.js            # Cliente Google Gemini
├── services/
│   ├── geminiService.js     # Embeddings y generación de texto
│   ├── dbService.js         # Queries con Neon (RAG)
│   └── chatService.js       # Pipeline RAG completo
├── controllers/
│   ├── chatController.js    # Endpoints de chat
│   └── productController.js # Sincronización de productos
├── routes/
│   ├── chatRoutes.js        # Rutas /api/chat/*
│   └── productRoutes.js     # Rutas /api/products/*
├── middleware/
│   └── errorHandler.js      # Manejo global de errores
├── utils/
│   └── intentAnalyzer.js    # Análisis de intenciones
├── index.js                 # Punto de entrada
├── package.json
├── .env.example
└── .gitignore
```

## Tecnologías

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Runtime | Node.js | v18+ |
| Framework | Express.js | 4.21.1 |
| Base de Datos | Neon PostgreSQL | Latest |
| Vector Search | pgvector | Latest |
| IA | Google Gemini API | Latest |
| Cliente DB | @neondatabase/serverless | 0.10.4 |

## Notas Importantes

**Embeddings**: Los productos en `bd_SIASA.sql` tienen embeddings simulados. Usa `/api/products/sync` o `update-embeddings.js` para generar embeddings reales.

**Rate Limits**: Google Gemini tiene límites de tasa. Para producción, implementa rate limiting y caching.

**Seguridad**: Este es un MVP. Para producción:
- Implementa autenticación (JWT)
- Valida y sanitiza entradas
- Configura CORS apropiadamente
- Usa HTTPS

**Escalabilidad**: Neon escala automáticamente. Para alto tráfico considera implementar caching de embeddings y usar Redis para sesiones.

## Licencia

ISC
