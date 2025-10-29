import { supabase } from "../config/supabase.js";

export const importProducts = async(req, res) => {
    try {
        const response = req.body;
        const data = response["data"];

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Formato inválido: debe ser una lista de objetos" });
        }

        let insertedProducts = 0;
        let updatedProducts = 0;
        let insertedPrices = 0;

        for (const item of data) {
            try {
                const { name, company_id, price, img, link } = item;

                // Validar campos esenciales
                if (!name || !company_id || !price || !link) {
                    continue; // Saltamos este producto si falta algo esencial
                }

                // 1️ Buscar o crear producto
                const { data: productData, error: productError } = await supabase
                    .from("products")
                    .select("*")
                    .eq("name", name)
                    .single();

                let productId;

                if (productData && !productError) {
                    // Producto existente
                    productId = productData.id;
                    updatedProducts++;
                } else {
                    // Crear nuevo producto
                    const { data: newProduct, error: insertError } = await supabase
                        .from("products")
                        .insert({
                            name: name,
                            brand: null,
                            category: null,
                            unit: null
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    productId = newProduct.id;
                    insertedProducts++;
                }

                // 2️ Buscar o crear fuente (product_sources)
                const { data: sourceData } = await supabase
                    .from("product_sources")
                    .select("*")
                    .eq("product_id", productId)
                    .eq("company_id", company_id)
                    .eq("url", link)
                    .single();

                if (!sourceData) {
                    await supabase
                        .from("product_sources")
                        .insert({
                            product_id: productId,
                            company_id: company_id,
                            url: link,
                            image_url: img
                        });
                }

                // 3️ Insertar nuevo precio
                await supabase
                    .from("product_prices")
                    .insert({
                        product_id: productId,
                        company_id: company_id,
                        price: price,
                        timestamp: new Date().toISOString()
                    });
                insertedPrices++;

            } catch (itemError) {
                console.error(`Error procesando producto ${item.name}:`, itemError);
                continue;
            }
        }

        res.json({
            status: "ok",
            inserted_products: insertedProducts,
            updated_products: updatedProducts,
            inserted_prices: insertedPrices
        });

    } catch (error) {
        console.error("Error importando productos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};