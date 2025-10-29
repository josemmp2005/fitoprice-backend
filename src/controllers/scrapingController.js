import { saveProducts } from '../services/productService.js';

export const importProducts = async(req, res) => {
    try {
        const products = req.body; // JSON recibido de n8n
        if (!Array.isArray(products)) {
            return res.status(400).json({ error: 'Debe enviar un array de productos' });
        }

        const result = await saveProducts(products);
        res.json({ ok: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
};