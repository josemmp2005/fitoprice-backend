import { query } from "../config/db.js";
import { packPrice, productInfo } from "../lib/productInfo.js";
import { matchRegistry } from "../lib/registryMatch.js";
import { storeImage } from "../lib/imageStore.js";

async function processProduct(productName, productPrice, productImgUrl, productLink, companyId) {

    try {
        // 1️ Buscar producto existente
        const existing = await query("SELECT id FROM products WHERE name = $1 LIMIT 1", [productName]);

        let productId;
        let isNew = false;

        if (existing.rows.length > 0) {
            productId = existing.rows[0].id;
        } else {
            // 2️ Crear nuevo producto
            // Envase, tipo y materias activas salen del nombre
            const info = productInfo(productName);
            const inserted = await query(
                `INSERT INTO products (name, product_img_url, unit, pack_amount, category, active_ingredients)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [productName, productImgUrl, info.unit, info.pack_amount, info.category, info.active_ingredients]
            );
            productId = inserted.rows[0].id;
            isNew = true;

            // La foto se copia a Cloudflare R2 (si está configurado) con el id del producto como nombre
            const storedImg = await storeImage(productImgUrl, productId);
            if (storedImg !== productImgUrl) {
                await query("UPDATE products SET product_img_url = $1 WHERE id = $2", [storedImg, productId]);
            }
        }

        // 3️ Insertar precio
        await query(
            "INSERT INTO product_prices (product_id, company_id, price, product_link) VALUES ($1, $2, $3, $4)",
            [productId, companyId, productPrice, productLink]
        );

        return { success: true, isNew, productId };
    } catch (error) {
        // Capturar error completo
        console.error(`   🚨 Error detallado:`, {
            message: error.message,
            code: error.code,
            cause: error.cause,
            stack: error.stack && error.stack.split('\n')[0]
        });
        throw error;
    }
}

export const importProducts = async(req, res) => {
    const data = req.body && req.body["data"];

    // Validar que data es un array
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Formato inválido: debe ser una lista de objetos" });
    }

    try {
        res.json({ status: "ok", ...await importGroups(data) });
    } catch (error) {
        console.error("Error general:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

// Guarda los grupos que envía n8n (o scripts/scrape.js):
// [{ company_id, name: [...], price: [...céntimos], img: [...], link: [...], price_unit?: [...] }]
// price_unit (opcional) marca los precios que la tienda da por litro o kilo ("L" o "kg"):
// se pasan a precio del envase con el tamaño del nombre, y si no se sabe se descartan.
export async function importGroups(data) {
    let insertedProducts = 0;
    let updatedProducts = 0;
    let insertedPrices = 0;
    let errors = [];
    let totalProcessed = 0;

    // Sin pausas entre productos: en Vercel la función tiene un tiempo máximo (vercel.json)
    // y Neon aguanta sin problema unas cientos de consultas seguidas.
    console.log(`🚀 Iniciando importación de productos...`);

    // Iterar sobre cada grupo
    for (const group of data) {
        const { company_id, name, price, img, link, price_unit } = group;

        // Verificar que los campos sean arrays
        if (!Array.isArray(name) || !Array.isArray(price) || !Array.isArray(link) || !Array.isArray(img)) {
            console.log("⚠️ Grupo sin formato de arrays, saltando...");
            continue;
        }

        // Procesar productos en lotes
        for (let i = 0; i < name.length; i++) {
            try {
                const productName = name[i];
                const unit = Array.isArray(price_unit) ? price_unit[i] : null;
                const productPrice = unit ? packPrice(productName, price[i], unit) : price[i];
                if (unit && !productPrice) {
                    errors.push({ product: productName, error: `Precio por ${unit} y el nombre no da el envase en ${unit}` });
                    continue;
                }
                const productImgUrl = img[i];
                const productLink = link[i];

                // Validar campos esenciales
                if (!productName || !company_id || !productPrice) {
                    console.log(`⚠️ Saltando producto por campos faltantes`);
                    continue;
                }

                totalProcessed++;
                console.log(`[${totalProcessed}] Procesando: ${productName}`);

                // Procesar producto
                const result = await processProduct(productName, productPrice, productImgUrl, productLink, company_id);

                if (result.isNew) {
                    insertedProducts++;
                    console.log(`   ✅ Nuevo (ID: ${result.productId})`);
                } else {
                    updatedProducts++;
                    console.log(`   ✅ Existe (ID: ${result.productId})`);
                }

                insertedPrices++;
            } catch (productError) {
                console.error(`   ❌ Error: ${productError.message}`);
                errors.push({ product: name[i], error: productError.message });
            }
        }
    }

    // Los productos nuevos se enlazan con el registro oficial de fitosanitarios
    if (insertedProducts > 0) await matchRegistry();

    console.log(`\n✅ Importación completada!`);
    console.log(`   📊 Total procesados: ${totalProcessed}`);
    console.log(`   ➕ Productos nuevos: ${insertedProducts}`);
    console.log(`   🔄 Productos existentes: ${updatedProducts}`);
    console.log(`   💰 Precios insertados: ${insertedPrices}`);
    console.log(`   ❌ Errores: ${errors.length}`);

    return {
        inserted_products: insertedProducts,
        updated_products: updatedProducts,
        inserted_prices: insertedPrices,
        total_processed: totalProcessed,
        errors: errors.length > 0 ? errors : undefined
    };
}

// Devuelve cada producto con su último precio, la variación respecto al anterior
// y el precio por litro o kilo (price_per_unit, en céntimos) cuando se conoce el envase.
// alternativesOf: productos que comparten alguna materia activa con ese id (sin incluirlo).
async function findProductsWithLatestPrice({ id = null, limit = null, alternativesOf = null } = {}) {
    const { rows } = await query(
        `SELECT p.*,
                pr.price,
                CASE WHEN p.pack_amount > 0 THEN round(pr.price / p.pack_amount)::int END AS price_per_unit,
                pr.previous_price,
                pr.scraped_at,
                pr.product_link,
                pr.company_id,
                c.name    AS company_name,
                c.website AS company_website
         FROM products p
         LEFT JOIN LATERAL (
             SELECT price, scraped_at, product_link, company_id,
                    lead(price) OVER (ORDER BY scraped_at DESC, id DESC) AS previous_price
             FROM product_prices
             WHERE product_id = p.id
             ORDER BY scraped_at DESC, id DESC
             LIMIT 1
         ) pr ON true
         LEFT JOIN companies c ON c.id = pr.company_id
         WHERE ($1::int IS NULL OR p.id = $1::int)
           AND ($3::int IS NULL OR (
                p.id <> $3::int
                AND p.active_ingredients && (SELECT active_ingredients FROM products WHERE id = $3::int)
           ))
         ORDER BY p.id
         LIMIT $2::int`,
        [id, limit, alternativesOf]
    );

    return rows.map(({ previous_price, ...product }) => ({
        ...product,
        percentage_change: previous_price
            ? (((product.price - previous_price) / previous_price) * 100).toFixed(2)
            : null
    }));
}

const sendProducts = (getOptions) => async(req, res) => {
    try {
        res.json(await findProductsWithLatestPrice(getOptions(req)));
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getAllProducts = sendProducts(() => ({}));

export const getfifteenProducts = sendProducts(() => ({ limit: 10 }));

export const getProductById = sendProducts((req) => ({ id: req.params.id }));

// Alternativas: comparten materia activa. Primero las del mismo tipo y con más materias
// en común; luego las más baratas por litro o kilo en la misma unidad.
export const getProductAlternatives = async(req, res) => {
    try {
        const [product] = await findProductsWithLatestPrice({ id: req.params.id });
        if (!product) return res.status(404).json({ error: "Producto no encontrado" });

        const shared = (p) => p.active_ingredients.filter((a) => product.active_ingredients.includes(a)).length;
        const sameUnit = (p) => (p.unit && p.unit === product.unit && p.price_per_unit != null ? 0 : 1);

        const alternatives = (await findProductsWithLatestPrice({ alternativesOf: product.id }))
            .filter((p) => p.price != null)
            .sort((a, b) =>
                (a.category === product.category ? 0 : 1) - (b.category === product.category ? 0 : 1) ||
                shared(b) - shared(a) ||
                sameUnit(a) - sameUnit(b) ||
                (a.price_per_unit ?? Infinity) - (b.price_per_unit ?? Infinity) ||
                a.price - b.price
            )
            .slice(0, 8);

        res.json(alternatives);
    } catch (error) {
        console.error("Error al obtener alternativas:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getLastProductPrice = async(req, res) => {
    try {
        const { rows } = await query(
            "SELECT price, scraped_at FROM product_prices WHERE product_id = $1 ORDER BY scraped_at DESC, id DESC LIMIT 1",
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: "El producto no tiene precios" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener el último precio del producto:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getHistoryProductPrice = async(req, res) => {
    try {
        const { rows } = await query(
            "SELECT * FROM product_prices WHERE product_id = $1 ORDER BY scraped_at, id",
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener el historial de precios del producto:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getLastScrapedAt = async(req, res) => {
    try {
        const { rows } = await query("SELECT scraped_at FROM product_prices ORDER BY scraped_at DESC LIMIT 1");
        if (rows.length === 0) {
            return res.status(404).json({ error: "Todavía no hay precios" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener la última fecha de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getCountProducts = async(req, res) => {
    try {
        const { rows } = await query("SELECT count(*)::int AS count FROM products");
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener el conteo de productos:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};
