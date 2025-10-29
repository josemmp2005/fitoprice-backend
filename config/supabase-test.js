import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_KEY deben estar definidos en .env');
}

// Crear un agente HTTP personalizado para evitar problemas de conexión
const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    rejectUnauthorized: true
});

// Custom fetch con agente HTTP
const customFetch = (url, options = {}) => {
    const agent = url.startsWith('https') ? httpsAgent : httpAgent;
    return fetch(url, {
        ...options,
        agent
    });
};

// Configuración con opciones de fetch más robustas
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    global: {
        headers: {
            'Connection': 'keep-alive'
        },
        fetch: customFetch
    },
    db: {
        schema: 'public'
    }
});