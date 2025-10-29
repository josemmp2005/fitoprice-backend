import { supabase } from './config/supabase-v2.js';

async function testConnection() {
    try {
        console.log('🧪 Probando conexión con agente Undici...\n');

        // Test 1: Buscar producto
        console.log('1️⃣ Buscando productos...');
        const { data: products, error: searchError } = await supabase
            .from('products')
            .select('id, name')
            .limit(1);

        if (searchError) {
            console.error('❌ Error en búsqueda:', searchError);
            process.exit(1);
        }

        console.log('✅ Búsqueda exitosa:', products);

        // Test 2: Insertar producto
        console.log('\n2️⃣ Insertando producto de prueba...');
        const testProductName = `TEST_PRODUCT_${Date.now()}`;

        const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert({ name: testProductName, brand: null, category: null, unit: null })
            .select('id')
            .single();

        if (insertError) {
            console.error('❌ Error en inserción:', insertError);
            process.exit(1);
        }

        console.log('✅ Producto insertado con ID:', newProduct.id);

        // Test 3: Insertar precio
        console.log('\n3️⃣ Insertando precio de prueba...');
        const { error: priceError } = await supabase
            .from('product_prices')
            .insert({
                product_id: newProduct.id,
                company_id: 1,
                price: 99.99
            });

        if (priceError) {
            console.error('❌ Error en precio:', priceError);
            process.exit(1);
        }

        console.log('✅ Precio insertado correctamente');

        console.log('\n🎉 ¡Todas las pruebas pasaron con agente Undici!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error general:', error);
        console.error('Detalles:', {
            message: error.message,
            code: error.code,
            cause: error.cause
        });
        process.exit(1);
    }
}

testConnection();