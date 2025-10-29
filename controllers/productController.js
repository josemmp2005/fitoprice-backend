import { supabase } from "../config/supabase.js";

export const importProducts = async(req, res) => {
    try {
        const products = req.body;

        if (!Array.isArray(products)) {
            return res.status(400).json({ error: "El cuerpo debe ser un array de productos" });
        }

        for (const p of products) {
            const { company_id, name, price, img, link } = p;
            await supabase.query(
                `INSERT INTO products (company_id, name, price, img, link)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (link) DO UPDATE SET
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           img = EXCLUDED.img`, [company_id, name, price, img, link]
            );
        }

        res.json({ success: true, count: products.length });
    } catch (error) {
        console.error("Error importando productos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};