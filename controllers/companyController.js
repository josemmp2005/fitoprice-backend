import { supabase } from "../config/supabase.js";

export const getCompanies = async(req, res) => {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*, product_prices(product_id)');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Contar productos únicos por empresa
        const companiesWithCount = data.map(company => {
            // Obtener IDs únicos de productos
            const uniqueProductIds = new Set(
                company.product_prices.map(pp => pp.product_id)
            );

            return {
                ...company,
                product_count: uniqueProductIds.size,
                product_prices: undefined // Eliminar array anidado
            };
        });

        res.json(companiesWithCount);
    } catch (error) {
        console.error("Error al obtener empresas:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const addCompany = async(req, res) => {
    try {
        const { name, website } = req.body;
        const { data, error } = await supabase
            .from('companies')
            .insert({ name, website })
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(201).json(data);
    } catch (error) {
        console.error("Error al agregar empresa:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const addScrapingConfCompany = async(req, res) => {
    try {
        const { companyId } = req.params;
        const {} = req.body;
        const { data, error } = await supabase
            .from('companies')
            .update({})
            .eq('id', companyId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (error) {
        console.error("Error al agregar configuración de scraping a la empresa:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getCompaniesByProduct = async(req, res) => {
    try {
        const { productId } = req.params;
        // Traemos todas las filas de product_prices para ese producto incluyendo la info de company
        const { data, error } = await supabase
            .from('product_prices')
            .select('company_id, product_link, scraped_at, price, companies(name, website)')
            .eq('product_id', productId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Dedupe por company_id quedándonos con la entrada con scraped_at más reciente
        const latestByCompany = new Map();
        for (const row of data) {
            const cid = row.company_id;
            const existing = latestByCompany.get(cid);
            if (!existing) {
                latestByCompany.set(cid, row);
                continue;
            }
            const existingDate = existing.scraped_at ? new Date(existing.scraped_at) : null;
            const rowDate = row.scraped_at ? new Date(row.scraped_at) : null;
            if (!existingDate && rowDate) {
                latestByCompany.set(cid, row);
            } else if (existingDate && rowDate && rowDate > existingDate) {
                latestByCompany.set(cid, row);
            }
        }

        // Formatear resultado y ordenar por precio ascendente
        const result = Array.from(latestByCompany.values())
            .map(r => ({
                company_id: r.company_id,
                name: r.companies ? r.companies.name : null,
                website: r.companies ? r.companies.website : null,
                product_link: r.product_link,
                price: r.price,
                scraped_at: r.scraped_at
            }))
            .sort((a, b) => {
                const priceA = a.price !== null && a.price !== undefined ? a.price : Infinity;
                const priceB = b.price !== null && b.price !== undefined ? b.price : Infinity;
                return priceA - priceB;
            });

        res.json(result);
    } catch (error) {
        console.error("Error al obtener empresas por producto:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getScrapingConfigs = async(req, res) => {
    try {
        const { data, error } = await supabase
            .from('company_urls')
            .select('*, scraping_config(*)');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (error) {
        console.error("Error al obtener configuraciones de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getScrapingConfigCompany = async(req, res) => {
    try {
        const { companyId } = req.params;
        const { data, error } = await supabase
            .from('company_urls')
            .select('*, scraping_config(*)')
            .eq('company_id', companyId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (error) {
        console.error("Error al obtener configuración de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};