import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth.js";

// Middleware para requerir autenticación vía token Bearer (JWT propio)
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    try {
        const payload = jwt.verify(parts[1], JWT_SECRET, { algorithms: ['HS256'] });
        // Adjuntamos el usuario al request para que los handlers lo usen
        req.user = { id: payload.sub, email: payload.email };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Para procesos automáticos (el workflow de n8n): cabecera X-API-Key igual a
// SCRAPER_API_KEY. Si no la traen, se acepta también un administrador con JWT.
export const requireScraperKey = (req, res, next) => {
    const sent = req.headers['x-api-key'];
    if (!sent) return requireAuth(req, res, next);

    const expected = process.env.SCRAPER_API_KEY;
    const a = Buffer.from(String(sent));
    const b = Buffer.from(expected ?? '');
    if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
};
