import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import chatRoutes from './routes/chatRoutes.js';
import productRoutes from './routes/productRoutes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Chatbot B2B Backend'
    });
});

app.use('/api/chat', chatRoutes);
app.use('/api/products', productRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.path
    });
});

app.use(errorHandler);

async function startServer() {
    try {
        console.log('Iniciando servidor...\n');

        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
        }

        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurada. Necesitas la URL de conexión de Neon PostgreSQL');
        }

        console.log('Verificando conexión a Neon PostgreSQL...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            throw new Error('No se pudo conectar a Neon PostgreSQL');
        }

        app.listen(PORT, () => {
            console.log('\nServidor iniciado exitosamente');
            console.log(`Escuchando en http://localhost:${PORT}`);
            console.log(`\nEndpoints disponibles:`);
            console.log(`   GET  /health`);
            console.log(`   POST /api/chat/message`);
            console.log(`   POST /api/products/sync`);
            console.log('\nPresiona Ctrl+C para detener el servidor\n');
        });

    } catch (error) {
        console.error('Error al iniciar el servidor:', error.message);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\n\nCerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\nCerrando servidor...');
    process.exit(0);
});

startServer();
