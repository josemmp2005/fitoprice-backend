import { supabase } from "../config/supabase.js";

export const createNewScrapingJob = async(req, res) => {
    try {
        const { company_id, url, selector_title, selector_price, selector_image, selector_link } = req.body;

        // Validar campos requeridos
        if (!company_id || !url || !selector_title || !selector_price || !selector_image || !selector_link) {
            return res.status(400).json({ error: "Todos los campos son requeridos" });
        }

        // console.log('Creando job de scraping:', { company_id, url, selector_title, selector_price, selector_image, selector_link });

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

        // console.log('URL creada:', data);
        const urlId = data.id;
        // console.log('URL ID:', urlId);

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