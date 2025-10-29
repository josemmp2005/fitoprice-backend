import { supabase } from "../config/supabase.js";

export const importProducts = async(req, res) => {
    try {
        const response = req.body;
        const data = response["data"];

        // Validar que data es un array
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Formato inválido: debe ser una lista de objetos" });
        }

        let totalProducts = 0;

        // Iterar sobre cada grupo
        for (const group of data) {
            const { company_id, name, price, img, link } = group;

            // Verificar que los campos sean arrays
            if (!Array.isArray(name) || !Array.isArray(price) || !Array.isArray(link) || !Array.isArray(img)) {
                console.log(" Grupo sin formato de arrays, saltando...");
                continue;
            }

            // Iterar sobre cada producto del grupo
            for (let i = 0; i < name.length; i++) {
                const product = {
                    company_id: company_id,
                    name: name[i],
                    price: price[i],
                    link: link[i],
                    img: img[i]
                };

                console.log(`\n Producto ${totalProducts + 1}:`, product);
                totalProducts++;
            }
        }

        res.json({
            status: "ok",
            message: "Iteración completada sin inserciones",
            total_products: totalProducts
        });

    } catch (error) {
        console.error("Error importando productos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};



//     let insertedProducts = 0;
//     let updatedProducts = 0;
//     let insertedPrices = 0;

//     for (const item of data) {
//         try {
//             const { name, company_id, price, img, link } = item;

//             // Validar campos esenciales
//             if (!name || !company_id || !price || !link) {
//                 continue; // Saltamos este producto si falta algo esencial
//             }

//             // 1️⃣ Buscar o crear producto
//             const { data: productData, error: productError } = await supabase
//                 .from("products")
//                 .select("*")
//                 .eq("name", name)
//                 .single();

//             let productId;

//             if (productData && !productError) {
//                 // Producto existente
//                 productId = productData.id;
//                 updatedProducts++;
//             } else {
//                 // Crear nuevo producto
//                 const { data: newProduct, error: insertError } = await supabase
//                     .from("products")
//                     .insert({
//                         name: name,
//                         brand: null,
//                         category: null,
//                         unit: null
//                     })
//                     .select()
//                     .single();

//                 if (insertError) throw insertError;
//                 productId = newProduct.id;
//                 insertedProducts++;
//             }

//             // 2️⃣ Buscar o crear fuente (product_sources)
//             const { data: sourceData } = await supabase
//                 .from("product_sources")
//                 .select("*")
//                 .eq("product_id", productId)
//                 .eq("company_id", company_id)
//                 .eq("url", link)
//                 .single();

//             if (!sourceData) {
//                 await supabase
//                     .from("product_sources")
//                     .insert({
//                         product_id: productId,
//                         company_id: company_id,
//                         url: link,
//                         image_url: img
//                     });
//             }

//             // 3️⃣ Insertar nuevo precio
//             await supabase
//                 .from("product_prices")
//                 .insert({
//                     product_id: productId,
//                     company_id: company_id,
//                     price: price,
//                     timestamp: new Date().toISOString()
//                 });
//             insertedPrices++;

//         } catch (itemError) {
//             console.error(`❌ Error procesando producto ${item.name}:`, itemError);
//             continue;
//         }
//     }

//     res.json({
//         status: "ok",
//         inserted_products: insertedProducts,
//         updated_products: updatedProducts,
//         inserted_prices: insertedPrices
//     });