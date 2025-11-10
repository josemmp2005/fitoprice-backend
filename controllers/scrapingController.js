import { supabase } from "../config/supabase.js";

export const createNewScrapingJob = async(req, res) => {
    try {
        const { companyId, url, name_class, price_class, link_class, img_class } = req.body;
        const { data, error } = await supabase
            .from('company_urls')
            .insert({
                company_id: companyId,
                url: url,
                active: true
            })
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        const urlId = data.id;
        // Ahora insertar las configuraciones de scraping
        const { data: confData, error: confError } = await supabase
            .from('scraping_config')
            .insert({
                company_url_id: urlId,
                selector_price: price_class,
                selector_title: name_class,
                selector_link: link_class,
                selector_image: img_class
            })
            .select()
            .single();
        if (confError) {
            return res.status(500).json({ error: confError.message });
        }
        res.status(201).json({ url: data, scraping_config: confData });
    } catch (error) {
        console.error("Error al crear nuevo trabajo de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};