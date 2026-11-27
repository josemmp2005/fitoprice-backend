// Scraper local: hace lo mismo que el workflow de n8n (FitoPrice-n8n) sin necesitar n8n.
// Sirve para cargar datos a mano o probar selectores; el scraping programado lo hace n8n.
// Lee las URLs activas (company_urls + scraping_config), descarga cada página
// siguiendo la paginación y guarda los precios con el mismo importador que /products/import.
//
//   npm run scrape            -> raspa y guarda
//   npm run scrape -- --dry   -> solo muestra lo que encontraría
//   npm run scrape -- --company=4   -> solo esa empresa (para estrenar una tienda nueva)

import * as cheerio from "cheerio";
import { pool, query } from "../config/db.js";
import { importGroups } from "../controllers/productController.js";
import { packPrice, priceUnitOf } from "../lib/productInfo.js";

const DRY_RUN = process.argv.includes("--dry");
const COMPANY = Number(process.argv.find((a) => a.startsWith("--company="))?.split("=")[1]) || null;
const MAX_PAGES = 20;          // tope de páginas por URL
const PAGE_DELAY = 1500;       // pausa entre peticiones, para no cargar las webs
const USER_AGENT = "Mozilla/5.0 (compatible; FitoPriceBot/1.0)";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// "1.250,50 €" -> 125050 céntimos
function parsePrice(text) {
    const match = String(text).replace(/\s+/g, " ").match(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?/);
    if (!match) return null;
    const value = parseFloat(match[0].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

// Precio dentro del elemento: si hay oferta (<ins>) se usa el rebajado;
// si hay rango o "Desde X", el primero (el más bajo)
function priceFrom($price) {
    const offer = $price.find("ins").first();
    const amount = (offer.length ? offer : $price).find(".amount").first();
    return parsePrice((amount.length ? amount : offer.length ? offer : $price).text());
}

// Si la página no tiene selector de ficha: sube desde el título hasta el ancestro
// más alto que todavía contiene un solo título. Así cada precio queda con su
// producto aunque alguno no tenga precio.
function cardOf($, el, selectorTitle) {
    let card = $(el);
    for (let parent = card.parent(); parent.length && parent[0].type !== "root"; parent = parent.parent()) {
        if (parent.find(selectorTitle).length > 1) break;
        card = parent;
    }
    return card;
}

function extractProducts(html, pageUrl, cfg) {
    const $ = cheerio.load(html);
    const products = [];

    // Con selector de ficha, cada ficha es un producto y el resto se busca dentro de ella
    const entries = cfg.selector_card
        ? $(cfg.selector_card).toArray().map((card) => ({ card: $(card), title: $(card).find(cfg.selector_title).first() }))
        : $(cfg.selector_title).toArray().map((el) => ({ card: cardOf($, el, cfg.selector_title), title: $(el) }));

    entries.forEach(({ card, title }) => {
        const el = title;
        const name = title.text().replace(/\s+/g, " ").trim();
        const $price = card.find(cfg.selector_price).first();
        const $img = card.find(cfg.selector_image).first();
        const $link = card.find(cfg.selector_link).first();

        const price = $price.length ? priceFrom($price) : null;
        if (!name || !price) return;

        const img = $img.attr("data-src") || $img.attr("data-lazy-src") || $img.attr("src") || "";
        const link = $link.attr("href") || $(el).attr("href") || "";

        products.push({
            name,
            price,
            price_unit: priceUnitOf($price.text()),   // "22,00 € por litro" -> "L"
            img: img && new URL(img, pageUrl).href,
            link: link && new URL(link, pageUrl).href
        });
    });

    const next = $('link[rel="next"]').attr("href") || $("a.next, a[rel=next]").first().attr("href");
    return { products, next: next ? new URL(next, pageUrl).href : null };
}

async function fetchHtml(url) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "es-ES,es" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

async function scrapeJob(job) {
    const found = [];
    const visited = new Set();
    let url = job.url;

    for (let page = 1; url && page <= MAX_PAGES && !visited.has(url); page++) {
        visited.add(url);
        const { products, next } = extractProducts(await fetchHtml(url), url, job);
        console.log(`   página ${page}: ${products.length} productos  (${url})`);
        found.push(...products);
        url = next;
        if (url) await sleep(PAGE_DELAY);
    }
    return found;
}

async function main() {
    const { rows: jobs } = await query(
        `SELECT cu.id, cu.company_id, cu.url, c.name AS company_name,
                sc.selector_card, sc.selector_title, sc.selector_price, sc.selector_image, sc.selector_link
         FROM company_urls cu
         JOIN scraping_config sc ON sc.company_url_id = cu.id
         JOIN companies c ON c.id = cu.company_id
         WHERE cu.active AND ($1::int IS NULL OR cu.company_id = $1::int)
         ORDER BY cu.company_id, cu.id`,
        [COMPANY]
    );

    if (jobs.length === 0) {
        console.log("No hay URLs activas en company_urls.");
        return;
    }

    // Un grupo por empresa; un producto aparece en varias categorías, así que se deduplica por nombre
    const groups = new Map();

    for (const job of jobs) {
        console.log(`\n🔎 ${job.company_name} · ${job.url}`);
        let products = [];
        try {
            products = await scrapeJob(job);
        } catch (error) {
            console.error(`   ❌ ${error.message}`);
            continue;
        }

        if (!groups.has(job.company_id)) groups.set(job.company_id, new Map());
        const byName = groups.get(job.company_id);
        for (const p of products) if (!byName.has(p.name)) byName.set(p.name, p);
        await sleep(PAGE_DELAY);
    }

    const data = [...groups].map(([company_id, byName]) => {
        const list = [...byName.values()];
        return {
            company_id,
            name: list.map(p => p.name),
            price: list.map(p => p.price),
            img: list.map(p => p.img),
            link: list.map(p => p.link),
            price_unit: list.map(p => p.price_unit)
        };
    });

    for (const g of data) console.log(`\nEmpresa ${g.company_id}: ${g.name.length} productos únicos`);

    if (DRY_RUN) {
        for (const g of data) {
            g.name.slice(0, 5).forEach((n, i) => {
                const unit = g.price_unit[i];
                const pack = unit ? packPrice(n, g.price[i], unit) : g.price[i];
                const shown = pack ? `${(pack / 100).toFixed(2)} €` : "sin envase: se descartaría";
                console.log(`   ${n} -> ${shown}${unit ? ` (la tienda da ${(g.price[i] / 100).toFixed(2)} €/${unit})` : ""}`);
            });
            const dropped = g.name.filter((n, i) => g.price_unit[i] && !packPrice(n, g.price[i], g.price_unit[i]));
            if (dropped.length) console.log(`   ${dropped.length} con precio por litro o kilo y sin envase en el nombre: ${dropped.join(" | ")}`);
        }
        console.log("\n(--dry: no se ha guardado nada)");
        return;
    }

    const result = await importGroups(data);
    console.log("\nResultado:", result);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
