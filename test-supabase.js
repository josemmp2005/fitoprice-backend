import { supabase } from './config/supabase.js';

async function testConnection() {
    console.log('🔍 Probando conexión a Supabase...\n');

    try {
        // Test 1: Listar productos
        console.log('Test 1: SELECT de productos...');
        const { data: products, error: selectError } = await supabase
            .from('products')
            .select('*')
            .limit(5);

        if (selectError) {
            console.error('❌ Error en SELECT:', selectError);
        } else {
            console.log('✅ SELECT exitoso. Productos encontrados:', products.length);
            console.log('Primeros productos:', products);
        }

        // Test 2: Insertar un producto de prueba
        console.log('\nTest 2: INSERT de producto de prueba...');
        const testProduct = {
            name: `TEST_PRODUCTO_${Date.now()}`,
            brand: null,
            category: null,
            unit: null
        };

        const { data: insertedProduct, error: insertError } = await supabase
            .from('products')
            .insert(testProduct)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error en INSERT:', insertError);
        } else {
            console.log('✅ INSERT exitoso:', insertedProduct);

            // Test 3: Insertar precio para ese producto
            console.log('\nTest 3: INSERT de precio...');
            const { data: insertedPrice, error: priceError } = await supabase
                .from('product_prices')
                .insert({
                    product_id: insertedProduct.id,
                    company_id: 1,
                    price: 12.50
                })
                .select()
                .single();

            if (priceError) {
                console.error('❌ Error en INSERT precio:', priceError);
            } else {
                console.log('✅ Precio insertado:', insertedPrice);
            }
        }

        console.log('\n✅ Todas las pruebas completadas');

    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

testConnection();