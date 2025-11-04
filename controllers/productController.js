import { supabase } from "../config/supabase.js";

// Función para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para procesar un producto individual SIN reintentos (para debug)
async function processProduct(productName, productPrice, companyId) {
    try {
        // 1️⃣ Buscar producto existente
        const { data: existingProduct, error: searchError } = await supabase
            .from("products")
            .select("id")
            .eq("name", productName)
            .maybeSingle();

        if (searchError) {
            console.error(`   🔍 Error búsqueda:`, {
                message: searchError.message,
                code: searchError.code,
                details: searchError.details,
                hint: searchError.hint
            });
            throw searchError;
        }

        let productId;
        let isNew = false;

        if (existingProduct) {
            productId = existingProduct.id;
        } else {
            // 2️⃣ Crear nuevo producto
            const { data: newProduct, error: insertError } = await supabase
                .from("products")
                .insert({
                    name: productName,
                    brand: null,
                    category: null,
                    unit: null
                })
                .select("id")
                .single();

            if (insertError) throw insertError;
            productId = newProduct.id;
            isNew = true;
        }

        // 3️⃣ Insertar precio
        const { error: priceError } = await supabase
            .from("product_prices")
            .insert({
                product_id: productId,
                company_id: companyId,
                price: productPrice
            });

        if (priceError) throw priceError;

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
    try {
        const response = req.body;
        const data = response["data"];

        // Validar que data es un array
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Formato inválido: debe ser una lista de objetos" });
        }

        let insertedProducts = 0;
        let updatedProducts = 0;
        let insertedPrices = 0;
        let errors = [];
        let totalProcessed = 0;

        const BATCH_SIZE = 50; // Procesar 50 productos, luego pausa
        const BATCH_DELAY = 1000; // 1 segundo entre lotes grandes
        const PRODUCT_DELAY = 0; // Sin pausa entre productos individuales

        console.log(`🚀 Iniciando importación de productos...`);

        // Iterar sobre cada grupo
        for (const group of data) {
            const { company_id, name, price, img, link } = group;

            // Verificar que los campos sean arrays
            if (!Array.isArray(name) || !Array.isArray(price) || !Array.isArray(link) || !Array.isArray(img)) {
                console.log("⚠️ Grupo sin formato de arrays, saltando...");
                continue;
            }

            // Procesar productos en lotes
            for (let i = 0; i < name.length; i++) {
                try {
                    const productName = name[i];
                    const productPrice = price[i];

                    // Validar campos esenciales
                    if (!productName || !company_id || !productPrice) {
                        console.log(`⚠️ Saltando producto por campos faltantes`);
                        continue;
                    }

                    totalProcessed++;
                    console.log(`[${totalProcessed}] Procesando: ${productName}`);

                    // Procesar producto
                    const result = await processProduct(productName, productPrice, company_id);

                    if (result.isNew) {
                        insertedProducts++;
                        console.log(`   ✅ Nuevo (ID: ${result.productId})`);
                    } else {
                        updatedProducts++;
                        console.log(`   ✅ Existe (ID: ${result.productId})`);
                    }

                    insertedPrices++;

                    // Pausa cada X productos
                    if (totalProcessed % BATCH_SIZE === 0) {
                        console.log(`⏸️  Pausa de ${BATCH_DELAY}ms después de ${BATCH_SIZE} productos...`);
                        await sleep(BATCH_DELAY);
                    } else if (PRODUCT_DELAY > 0) {
                        // Pausa entre productos (solo si está configurada)
                        await sleep(PRODUCT_DELAY);
                    }

                } catch (productError) {
                    console.error(`   ❌ Error: ${productError.message}`);
                    errors.push({ product: name[i], error: productError.message });
                }
            }
        }

        console.log(`\n✅ Importación completada!`);
        console.log(`   📊 Total procesados: ${totalProcessed}`);
        console.log(`   ➕ Productos nuevos: ${insertedProducts}`);
        console.log(`   🔄 Productos existentes: ${updatedProducts}`);
        console.log(`   💰 Precios insertados: ${insertedPrices}`);
        console.log(`   ❌ Errores: ${errors.length}`);

        res.json({
            status: "ok",
            inserted_products: insertedProducts,
            updated_products: updatedProducts,
            inserted_prices: insertedPrices,
            total_processed: totalProcessed,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("❌ Error general:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getAllProducts = async(req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*');
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(data);
    } catch (error) {
        console.error("❌ Error al obtener productos:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};