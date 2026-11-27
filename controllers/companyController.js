import { query } from "../config/db.js";

// Envuelve cada handler para responder 500 ante cualquier error
const handle = (message, fn) => async(req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.error(`${message}:`, error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

// URL de una empresa junto con su configuración de scraping (objeto o null)
const URL_WITH_CONFIG = `to_jsonb(u) || jsonb_build_object('scraping_config', to_jsonb(sc))`;

export const getCompanies = handle("Error al obtener empresas", async(req, res) => {
    // Incluye el número de productos únicos de cada empresa
    const { rows } = await query(
        `SELECT c.*, count(DISTINCT pp.product_id)::int AS product_count
         FROM companies c
         LEFT JOIN product_prices pp ON pp.company_id = c.id
         GROUP BY c.id
         ORDER BY c.id`
    );
    res.json(rows);
});

export const addCompany = handle("Error al agregar empresa", async(req, res) => {
    const { name, website } = req.body;
    const { rows } = await query(
        "INSERT INTO companies (name, website) VALUES ($1, $2) RETURNING *",
        [name, website]
    );
    res.status(201).json(rows[0]);
});

export const getCompaniesByProduct = handle("Error al obtener empresas por producto", async(req, res) => {
    // Última entrada de cada empresa para el producto, ordenadas por precio
    const { rows } = await query(
        `SELECT * FROM (
             SELECT DISTINCT ON (pp.company_id)
                    pp.company_id, c.name, c.website, pp.product_link, pp.price, pp.scraped_at
             FROM product_prices pp
             JOIN companies c ON c.id = pp.company_id
             WHERE pp.product_id = $1
             ORDER BY pp.company_id, pp.scraped_at DESC, pp.id DESC
         ) latest
         ORDER BY price`,
        [req.params.productId]
    );
    res.json(rows);
});

export const getScrapingConfigs = handle("Error al obtener configuraciones de scraping", async(req, res) => {
    const { rows } = await query(
        `SELECT c.id, c.name,
                coalesce(
                    jsonb_agg(${URL_WITH_CONFIG} ORDER BY u.id) FILTER (WHERE u.id IS NOT NULL),
                    '[]'
                ) AS company_urls
         FROM companies c
         LEFT JOIN company_urls u ON u.company_id = c.id
         LEFT JOIN scraping_config sc ON sc.company_url_id = u.id
         GROUP BY c.id
         ORDER BY c.id`
    );
    res.json(rows);
});

export const getScrapingConfigCompany = handle("Error al obtener configuración de scraping", async(req, res) => {
    const { rows } = await query(
        `SELECT ${URL_WITH_CONFIG} AS item
         FROM company_urls u
         LEFT JOIN scraping_config sc ON sc.company_url_id = u.id
         WHERE u.company_id = $1
         ORDER BY u.id`,
        [req.params.companyId]
    );
    res.json(rows.map(row => row.item));
});
