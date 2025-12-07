import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

export async function testConnection() {
    try {
        const result = await sql`SELECT NOW() as now, version() as version`;
        console.log('Conexión a Neon PostgreSQL exitosa:', result[0].now);
        console.log('  Versión:', result[0].version.split(' ')[0], result[0].version.split(' ')[1]);
        return true;
    } catch (error) {
        console.error('Error al conectar con Neon PostgreSQL:', error.message);
        return false;
    }
}

export default sql;
