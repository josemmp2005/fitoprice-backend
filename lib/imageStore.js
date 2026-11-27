// Fotos de los productos en Cloudflare R2.
// Las tiendas cambian o borran sus fotos y algunas bloquean que se enlacen desde otra web,
// así que al crear un producto se descarga su foto, se pasa a WebP y se guarda en R2.
// La base de datos (Neon, con poco espacio) solo guarda la URL pública.
//
// Sin las variables R2_* (desarrollo en local) no se sube nada y se usa la URL de la tienda.
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_URL: URL pública del bucket (https://pub-xxxx.r2.dev o un dominio propio)

import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import sharp from "sharp";

// Se lee al usarse (no al importar el módulo), por si dotenv se carga después
function config() {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
    if (!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL)) return null;
    return {
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
        publicBase: R2_PUBLIC_URL.replace(/\/+$/, ""),
        client: new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
    };
}

export const r2Enabled = () => config() !== null;

const MAX_BYTES = 5 * 1024 * 1024;   // foto original; las de catálogo pesan decenas de kB
const MAX_SIDE = 800;                // la web las enseña como mucho a ~400 px (800 para pantallas retina)
const WEBP_QUALITY = 80;
const TIMEOUT_MS = 8000;

// ¿La URL ya es de nuestro bucket?
export function isStored(url) {
    const r2 = config();
    return Boolean(r2 && url && url.startsWith(r2.publicBase + "/"));
}

// ¿Ya está en R2 y en WebP? Entonces no hay nada que hacer con ella.
export const isStoredWebp = (url) => isStored(url) && url.endsWith(".webp");

// Clave del objeto en el bucket a partir de su URL pública ("products/abc.jpg")
const keyOf = (r2, url) => url.slice(r2.publicBase.length + 1);

// Descarga la foto, la pasa a WebP (máximo 800 px de lado) y la sube a R2 como products/<nombre>.webp.
//   - Foto de la tienda: el nombre es un hash de su URL, no el id del producto, porque la base local
//     y la de producción comparten bucket y sus ids pueden no coincidir.
//   - Foto que ya estaba en R2 en otro formato (jpg, png…): se reconvierte con el mismo nombre.
// Devuelve la URL pública nueva, o la original si R2 no está configurado o algo falla
// (mejor una foto enlazada que ninguna).
export async function storeImage(sourceUrl, productId) {
    const r2 = config();
    if (!r2 || !sourceUrl || isStoredWebp(sourceUrl)) return sourceUrl;

    try {
        const name = isStored(sourceUrl)
            ? keyOf(r2, sourceUrl).replace(/^products\//, "").replace(/\.[a-z0-9]+$/i, "")
            : createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24);

        const response = await fetch(sourceUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; FitoPriceBot/1.0)" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (!type.startsWith("image/")) throw new Error(`no es una imagen (${type || "sin tipo"})`);

        const original = Buffer.from(await response.arrayBuffer());
        if (original.length > MAX_BYTES) throw new Error(`demasiado grande (${original.length} bytes)`);

        const body = await sharp(original, { animated: false })
            .rotate()   // respeta la orientación EXIF de las fotos de móvil
            .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();

        const key = `products/${name}.webp`;
        const upload = await r2.client.fetch(`${r2.endpoint}/${key}`, {
            method: "PUT",
            body,
            headers: {
                "Content-Type": "image/webp",
                // La foto de un producto no cambia: que el navegador y la CDN la guarden un año
                "Cache-Control": "public, max-age=31536000, immutable",
            },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!upload.ok) throw new Error(`R2 respondió ${upload.status}: ${(await upload.text()).slice(0, 200)}`);

        return `${r2.publicBase}/${key}`;
    } catch (error) {
        console.error(`   🖼️  No se pudo guardar la foto del producto ${productId} en R2: ${error.message}`);
        return sourceUrl;
    }
}

// Borra del bucket una foto que ya no se usa (p. ej. el .jpg después de pasarlo a WebP).
// Solo borra URLs de nuestro bucket; devuelve true si R2 lo confirma.
export async function deleteStored(url) {
    const r2 = config();
    if (!r2 || !isStored(url)) return false;
    const response = await r2.client.fetch(`${r2.endpoint}/${keyOf(r2, url)}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
}
