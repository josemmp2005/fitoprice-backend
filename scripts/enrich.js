// Recalcula envase, tipo y materias activas de todos los productos a partir de su nombre,
// y vuelve a enlazarlos con el registro oficial de fitosanitarios.
// Los productos nuevos ya se calculan al importarlos; esto es para los que ya existían
// o para cuando cambian las reglas de lib/productInfo.js.
//
//   npm run enrich

import { pool, query } from "../config/db.js";
import { productInfo } from "../lib/productInfo.js";
import { matchRegistry } from "../lib/registryMatch.js";

async function main() {
    const { rows } = await query("SELECT id, name FROM products ORDER BY id");
    let withPack = 0;

    for (const { id, name } of rows) {
        const info = productInfo(name);
        if (info.unit) withPack++;
        await query(
            "UPDATE products SET unit = $1, pack_amount = $2, category = $3, active_ingredients = $4 WHERE id = $5",
            [info.unit, info.pack_amount, info.category, info.active_ingredients, id]
        );
    }

    const { rows: types } = await query(
        "SELECT category, count(*)::int AS n FROM products GROUP BY category ORDER BY n DESC"
    );
    console.log(`${rows.length} productos actualizados; ${withPack} con tamaño de envase.`);
    for (const t of types) console.log(`   ${t.category}: ${t.n}`);

    // Con la materia activa recalculada, se vuelve a enlazar con el registro oficial
    const { matched } = await matchRegistry();
    console.log(`${matched} productos enlazados con el registro oficial.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
