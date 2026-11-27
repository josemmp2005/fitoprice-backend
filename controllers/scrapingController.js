import { pool, query } from "../config/db.js";

// Ejecuta fn dentro de una transacción: la URL y sus selectores se guardan juntos o no se guardan
async function transaction(fn) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export const createNewScrapingJob = async(req, res) => {
    try {
        const { company_id, url, selector_card, selector_title, selector_price, selector_image, selector_link } = req.body;

        // Validar campos requeridos
        if (!company_id || !url || !selector_title || !selector_price || !selector_image || !selector_link) {
            return res.status(400).json({ error: "Todos los campos son requeridos" });
        }

        const result = await transaction(async(client) => {
            // Insertar la URL de la empresa
            const { rows: [companyUrl] } = await client.query(
                "INSERT INTO company_urls (company_id, url) VALUES ($1, $2) RETURNING *",
                [parseInt(company_id), url]
            );

            // Insertar las configuraciones de scraping
            const { rows: [config] } = await client.query(
                `INSERT INTO scraping_config (company_url_id, selector_card, selector_title, selector_price, selector_image, selector_link)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [companyUrl.id, selector_card || null, selector_title, selector_price, selector_image, selector_link]
            );

            return { url: companyUrl, scraping_config: config };
        });

        res.status(201).json({
            message: "Configuración de scraping creada exitosamente",
            ...result
        });
    } catch (error) {
        console.error("Error al crear nuevo trabajo de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const updateScrapingJob = async(req, res) => {
    try {
        const { jobId } = req.params;
        const { url, selector_card, selector_title, selector_price, selector_image, selector_link, active } = req.body;

        // Los campos que no lleguen conservan su valor actual
        const result = await transaction(async(client) => {
            // Actualizar la URL de la empresa
            const { rows: [companyUrl] } = await client.query(
                "UPDATE company_urls SET url = coalesce($1, url), active = coalesce($2, active) WHERE id = $3 RETURNING *",
                [url || null, active, jobId]
            );
            if (!companyUrl) return null;

            // Actualizar las configuraciones de scraping
            const { rows: [config] } = await client.query(
                `UPDATE scraping_config
                 SET selector_title = coalesce($1, selector_title),
                     selector_price = coalesce($2, selector_price),
                     selector_image = coalesce($3, selector_image),
                     selector_link  = coalesce($4, selector_link),
                     selector_card  = coalesce($5, selector_card)
                 WHERE company_url_id = $6 RETURNING *`,
                [selector_title, selector_price, selector_image, selector_link, selector_card, jobId]
            );

            return { url: companyUrl, scraping_config: config };
        });

        if (!result) {
            return res.status(404).json({ error: "Trabajo de scraping no encontrado" });
        }

        res.json({
            message: "Trabajo de scraping actualizado exitosamente",
            ...result
        });
    } catch (error) {
        console.error("Error al actualizar trabajo de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

// Páginas activas con sus selectores, una fila por página.
// Solo las que tienen selector de ficha: sin él n8n no puede emparejar cada precio con su producto.
export const getActiveJobs = async(req, res) => {
    try {
        const { rows } = await query(
            `SELECT cu.id, cu.company_id, c.name AS company_name, cu.url,
                    sc.selector_card, sc.selector_title, sc.selector_price, sc.selector_image, sc.selector_link
             FROM company_urls cu
             JOIN scraping_config sc ON sc.company_url_id = cu.id
             JOIN companies c ON c.id = cu.company_id
             WHERE cu.active AND sc.selector_card IS NOT NULL
             ORDER BY cu.company_id, cu.id`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener las páginas activas:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};
