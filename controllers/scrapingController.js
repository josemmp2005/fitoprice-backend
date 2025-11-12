import { supabase } from "../config/supabase.js";

export const createNewScrapingJob = async(req, res) => {
    try {
        const { company_id, url, selector_title, selector_price, selector_image, selector_link } = req.body;

        // Validar campos requeridos
        if (!company_id || !url || !selector_title || !selector_price || !selector_image || !selector_link) {
            return res.status(400).json({ error: "Todos los campos son requeridos" });
        }

        // Insertar la URL de la empresa
        const { data, error } = await supabase
            .from('company_urls')
            .insert({
                company_id: parseInt(company_id),
                url: url,
                active: true
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const urlId = data.id;

        // Insertar las configuraciones de scraping
        const { data: confData, error: confError } = await supabase
            .from('scraping_config')
            .insert({
                company_url_id: urlId,
                selector_price: selector_price,
                selector_title: selector_title,
                selector_link: selector_link,
                selector_image: selector_image
            })
            .select()
            .single();

        if (confError) {
            return res.status(500).json({ error: confError.message });
        }

        res.status(201).json({
            message: "Configuración de scraping creada exitosamente",
            url: data,
            scraping_config: confData
        });
    } catch (error) {
        console.error("Error al crear nuevo trabajo de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const updateScrapingJob = async(req, res) => {
    try {
        const { jobId } = req.params;
        const { url, selector_title, selector_price, selector_image, selector_link, active } = req.body;

        // Actualizar la URL de la empresa
        const { data, error } = await supabase
            .from('company_urls')
            .update({
                url: url,
                active: active
            })
            .eq('id', jobId)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        // Actualizar las configuraciones de scraping
        const { data: confData, error: confError } = await supabase
            .from('scraping_config')
            .update({
                selector_price: selector_price,
                selector_title: selector_title,
                selector_link: selector_link,
                selector_image: selector_image
            })
            .eq('company_url_id', jobId)
            .select()
            .single();
        if (confError) {
            return res.status(500).json({ error: confError.message });
        }
        res.json({
            message: "Trabajo de scraping actualizado exitosamente",
            url: data,
            scraping_config: confData
        });

    } catch (error) {
        console.error("Error al crear nuevo trabajo de scraping:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};