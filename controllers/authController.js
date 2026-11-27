import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { JWT_SECRET } from "../config/auth.js";

export const login = async(req, res) => {
    try {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ error: "Email y contraseña son requeridos" });
        }

        const { rows: [user] } = await query(
            "SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)",
            [email]
        );

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }

        const token = jwt.sign({ email: user.email }, JWT_SECRET, {
            subject: String(user.id),
            expiresIn: "8h"
        });

        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
