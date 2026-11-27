import pg from 'pg';
import dotenv from 'dotenv';
import { attachDatabasePool } from '@vercel/functions';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL debe estar definido en .env');
}

// En local: el PostgreSQL de Docker (.env). En producción: Neon, con la cadena pooled
// (host con -pooler), que es la que `neon env pull` deja en DATABASE_URL.
// Driver: node-postgres (pg), el que recomienda Neon para Vercel con Fluid compute.
const serverless = Boolean(process.env.VERCEL);

export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: serverless ? 5 : 10,
    idleTimeoutMillis: serverless ? 5000 : 30000,
    connectionTimeoutMillis: 10000,
});

// En Vercel, cierra las conexiones inactivas antes de que la instancia se suspenda,
// para no dejar conexiones colgadas en Neon. Fuera de Vercel no hace nada.
if (serverless) attachDatabasePool(pool);

// Sin este manejador, un corte de conexión inactiva tumbaría el proceso
pool.on('error', (err) => console.error('Error en el pool de PostgreSQL:', err.message));

export const query = (text, params) => pool.query(text, params);
