// Enlaza los productos de las tiendas con el Registro Oficial de Productos Fitosanitarios
// por su nombre comercial: "Kay 24 EW 8 ML - Insecticida Tau Fluvalinato" -> "KAY 24 EW" (nº 16417).
//
// Reglas, de más a menos segura:
//  1. Un nombre del registro igual a la marca del producto.
//  2. Si no, nombres que empiezan igual ("Azufre WG" -> "AZUFRE WG MASSO"), pero solo si todos
//     apuntan al mismo número de registro. Si hay varios (Polysect Ultra AL / SL), no se enlaza:
//     mejor no enseñar nada que enseñar los datos de otro producto.
//  3. Si conocemos la materia activa del producto, el registro tiene que contenerla.
//  4. El registro solo tiene fitosanitarios: abonos, bioestimulantes y demás solo se enlazan
//     con un nombre exacto (si no, "SOLAR PROTECK" acabaría en un herbicida llamado "SOLAR").

import { query } from "../config/db.js";

// Tipos de lib/productInfo.js que son fitosanitarios
const PHYTO_TYPES = /fungicidas|insecticidas|nematicidas|herbicidas/i;

const norm = (text) =>
    String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, " ").trim();

// Marca del producto: lo que va antes de " - ", "(" o del tamaño del envase
export function brandOf(name) {
    const first = String(name).split(/ [-–] |\(/)[0];
    return norm(first.replace(/\d+(?:[.,]\d+)?\s?(lts?|l|ml|kgs?|grs?|gr|g)\b.*$/i, ""));
}

// ¿Alguna materia activa del producto aparece en la composición del registro?
// Se comparan las primeras letras porque cambian las terminaciones ("Deltametrina" / "DELTAMETRIN").
function sharesActive(actives, composicion) {
    if (!actives?.length) return true;
    const substances = composicion.map((c) => norm(c.sustancia)).join(" | ");
    return actives.some((a) => substances.includes(norm(a).slice(0, 7)));
}

export function findRegistryMatch(product, registry) {
    const brand = brandOf(product.name);
    if (brand.length < 3) return null;

    const exact = new Set();
    const prefix = new Set();
    for (const r of registry) {
        if (!sharesActive(product.active_ingredients, r.composicion)) continue;
        for (const n of r.names) {
            if (n === brand) exact.add(r.num_registro);
            else if (n.startsWith(brand + " ") || brand.startsWith(n + " ")) prefix.add(r.num_registro);
        }
    }
    if (exact.size === 1) return [...exact][0];
    const phyto = PHYTO_TYPES.test(product.category ?? "");
    if (phyto && exact.size === 0 && prefix.size === 1) return [...prefix][0];
    return null;
}

// Recalcula el enlace de todos los productos. Devuelve cuántos han quedado enlazados.
export async function matchRegistry() {
    const { rows: registryRows } = await query("SELECT num_registro, nombres, composicion FROM registry_products");
    const registry = registryRows.map((r) => ({ ...r, names: r.nombres.map(norm) }));
    const { rows: products } = await query("SELECT id, name, category, active_ingredients FROM products");

    let matched = 0;
    for (const product of products) {
        const num = registry.length ? findRegistryMatch(product, registry) : null;
        if (num) matched++;
        await query("UPDATE products SET registry_num = $1 WHERE id = $2", [num, product.id]);
    }
    return { matched, products: products.length };
}
