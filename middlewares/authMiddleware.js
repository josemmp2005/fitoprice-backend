import { supabase } from "../config/supabase.js";

// Middleware para requerir autenticación vía token Bearer de Supabase
export const requireAuth = async(req, res, next) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return res.status(401).json({ error: 'Invalid authorization header format' });
        }

        const token = parts[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Usamos el cliente Supabase del servidor para validar el token
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data || !data.user) {
            // Si hay error o no hay usuario, rechazamos
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Adjuntamos el usuario al request para que los handlers lo usen
        req.user = data.user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal auth error' });
    }
};