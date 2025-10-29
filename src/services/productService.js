import { supabase } from '../config/supabase.js';

// Guarda productos en la tabla products + product_prices
export const saveProducts = async(items) => {
    const results = [];

    for (const item of items) {
        const { company_id, company_url_id, name, price, img, link } = item;

        // 1️ Buscar producto por nombre
        let { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('name', name)
            .single();

        let product_id;
        if (!product) {
            // 2️ Crear producto
            const { data: newProduct } = await supabase
                .from('products')
                .insert({ name })
                .select()
                .single();
            product_id = newProduct.id;
        } else {
            product_id = product.id;
        }

        // 3️ Insertar precio
        const { data: priceData } = await supabase.from('product_prices').insert({
            product_id,
            company_id,
            company_url_id,
            price,
            img,
            link
        });

        results.push({ product_id, price_id: priceData[0].id });
    }

    return results;
};