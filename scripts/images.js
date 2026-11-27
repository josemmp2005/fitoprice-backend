// Guarda en Cloudflare R2, en WebP, las fotos de los productos que aún no lo están:
//   - las que todavía apuntan a la web de la tienda (productos de antes de configurar R2,
//     o cuya foto falló al importarse);
//   - las que ya estaban en R2 en otro formato (jpg, png…): se pasan a WebP y se borra el original.
// Los productos nuevos ya se guardan al importarlos. Se puede lanzar varias veces: salta las hechas.
//
//   npm run images            -> convierte y actualiza la base de datos de DATABASE_URL
//   npm run images -- --dry   -> solo cuenta las que faltan

import { pool, query } from "../config/db.js";
import { deleteStored, isStored, isStoredWebp, r2Enabled, storeImage } from "../lib/imageStore.js";

const DRY_RUN = process.argv.includes("--dry");
const CONCURRENCY = 4;   // descargas a la vez: no cargar las webs de las tiendas

async function main() {
    if (!r2Enabled()) {
        console.log("Faltan las variables R2_* en .env: no hay dónde copiar las fotos.");
        process.exitCode = 1;
        return;
    }

    const { rows } = await query("SELECT id, product_img_url FROM products WHERE product_img_url IS NOT NULL AND product_img_url <> '' ORDER BY id");
    const pending = rows.filter((p) => !isStoredWebp(p.product_img_url));
    const toConvert = pending.filter((p) => isStored(p.product_img_url)).length;
    console.log(`${rows.length} productos con foto: ${pending.length - toConvert} sin copiar a R2 y ${toConvert} en R2 sin pasar a WebP.`);
    if (DRY_RUN || pending.length === 0) return;

    let done = 0;
    let failed = 0;
    let deleted = 0;
    const queue = [...pending];

    async function worker() {
        for (let product = queue.shift(); product; product = queue.shift()) {
            const oldUrl = product.product_img_url;
            const url = await storeImage(oldUrl, product.id);
            if (url === oldUrl) {
                failed++;
                continue;
            }
            await query("UPDATE products SET product_img_url = $1 WHERE id = $2", [url, product.id]);
            // El original en R2 (jpg, png…) ya no lo usa nadie: se borra después de guardar la URL nueva
            if (isStored(oldUrl) && await deleteStored(oldUrl)) deleted++;
            done++;
            if (done % 50 === 0) console.log(`   ${done} hechas…`);
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`En WebP: ${done} (originales borrados de R2: ${deleted}). Fallidas (se quedan como estaban): ${failed}.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
