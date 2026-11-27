import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar definido en .env');
}

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

// Sin este manejador, un corte de conexión inactiva tumbaría el proceso
pool.on('error', (err) => console.error('Error en el pool de PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);
