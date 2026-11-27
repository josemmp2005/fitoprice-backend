import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar definido en .env');
}

// En local: el PostgreSQL de Docker. En producción: Neon, con la cadena de conexión
// "pooled" (host con -pooler y ?sslmode=require), que aguanta las muchas conexiones cortas de Vercel.
// En Vercel cada instancia de la función abre pocas conexiones y las suelta pronto.
const serverless = Boolean(process.env.VERCEL);

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: serverless ? 3 : 10,
    idleTimeoutMillis: serverless ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
});

// Sin este manejador, un corte de conexión inactiva tumbaría el proceso
pool.on('error', (err) => console.error('Error en el pool de PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);
