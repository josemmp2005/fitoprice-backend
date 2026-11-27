// Copia a Cloudflare R2 las fotos de los productos que todavía apuntan a la web de la tienda.
// Los productos nuevos ya se copian al importarlos; esto sirve para los que había antes de
// configurar R2 o cuyas fotos fallaron. Se puede lanzar varias veces: salta los ya copiados.
//
//   npm run images            -> copia y actualiza la base de datos de DATABASE_URL
//   npm run images -- --dry   -> solo cuenta los que faltan

import { pool, query } from "../config/db.js";
import { isStored, r2Enabled, storeImage } from "../lib/imageStore.js";

const DRY_RUN = process.argv.includes("--dry");
const CONCURRENCY = 4;   // descargas a la vez: no cargar las webs de las tiendas

async function main() {
    if (!r2Enabled()) {
        console.log("Faltan las variables R2_* en .env: no hay dónde copiar las fotos.");
        process.exitCode = 1;
        return;
    }

    const { rows } = await query("SELECT id, product_img_url FROM products WHERE product_img_url IS NOT NULL AND product_img_url <> '' ORDER BY id");
    const pending = rows.filter((p) => !isStored(p.product_img_url));
    console.log(`${rows.length} productos con foto, ${pending.length} sin copiar a R2.`);
    if (DRY_RUN || pending.length === 0) return;

    let copied = 0;
    let failed = 0;
    const queue = [...pending];

    async function worker() {
        for (let product = queue.shift(); product; product = queue.shift()) {
            const url = await storeImage(product.product_img_url, product.id);
            if (url === product.product_img_url) {
                failed++;
                continue;
            }
            await query("UPDATE products SET product_img_url = $1 WHERE id = $2", [url, product.id]);
            copied++;
            if (copied % 50 === 0) console.log(`   ${copied} copiadas…`);
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`Copiadas: ${copied}. Fallidas (se quedan con la URL de la tienda): ${failed}.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
