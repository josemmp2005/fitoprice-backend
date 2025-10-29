import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Verificando variables de entorno:\n');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NO configurada');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ NO configurada');
console.log('\nURL completa:', process.env.SUPABASE_URL);
console.log('KEY (primeros 20 chars):', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 20) + '...' : 'N/A');