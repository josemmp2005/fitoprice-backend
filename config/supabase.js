import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Agent } from 'undici';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_KEY deben estar definidos en .env');
}

// Crear un agente de Undici con configuración robusta
const agent = new Agent({
    keepAliveTimeout: 30000,
    keepAliveMaxTimeout: 60000,
    maxConcurrentStreams: 100,
    connect: {
        timeout: 60000,
        keepAlive: true,
        keepAliveInitialDelay: 1000
    }
});

// Custom fetch usando undici
const customFetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        dispatcher: agent
    });
};

// Configuración del cliente Supabase
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