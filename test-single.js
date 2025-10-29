import { supabase } from './config/supabase.js';

async function testSingle() {
    console.log('🔍 Test de una sola inserción...\n');

    try {
        const testName = `TEST_${Date.now()}`;

        console.log('1. Insertando producto de prueba...');
        const { data, error } = await supabase
            .from('products')
            .insert({
                name: testName,
                brand: null,
                category: null,
                unit: null
            })
            .select('id')
            .single();

        if (error) {
            console.error('❌ Error:', error);
            console.error('Detalles completos:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Éxito! Producto creado con ID:', data.id);

            // Ahora insertar precio
            console.log('\n2. Insertando precio...');
            const { error: priceError } = await supabase
                .from('product_prices')
                .insert({
                    product_id: data.id,
                    company_id: 1,
                    price: 12.50
                });

            if (priceError) {
                console.error('❌ Error en precio:', priceError);
            } else {
                console.log('✅ Precio insertado correctamente');
            }
        }

    } catch (err) {
        console.error('❌ Error general:', err);
        console.error('Stack:', err.stack);
    }
}

testSingle();