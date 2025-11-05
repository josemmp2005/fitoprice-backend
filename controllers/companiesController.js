import { supabase } from "../config/supabase.js";

export const getCompanies = async(req, res) => {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (error) {
        console.error("Error al obtener empresas:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const addCompany = async(req, res) => {
    try {
        const { name, website, logo_url } = req.body;
        const { data, error } = await supabase
            .from('companies')
            .insert({ name, website, logo_url })
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