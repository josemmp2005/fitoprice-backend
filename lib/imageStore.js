// Fotos de los productos en Cloudflare R2.
// Las tiendas cambian o borran sus fotos y algunas bloquean que se enlacen desde otra web,
// así que al crear un producto se descarga su foto y se guarda en R2. La base de datos
// (Neon, con poco espacio) solo guarda la URL pública.
//
// Sin las variables R2_* (desarrollo en local) no se sube nada y se usa la URL de la tienda.
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_URL: URL pública del bucket (https://pub-xxxx.r2.dev o un dominio propio)

import { AwsClient } from "aws4fetch";

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

const MAX_BYTES = 3 * 1024 * 1024;   // las fotos de catálogo pesan decenas de kB; más de 3 MB es raro
const TIMEOUT_MS = 8000;
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

// ¿La URL ya es de nuestro bucket?
export function isStored(url) {
    const r2 = config();
    return Boolean(r2 && url && url.startsWith(r2.publicBase + "/"));
}

// Descarga la foto de la tienda y la sube a R2 como products/<id>.<ext>.
// Devuelve la URL pública, o la original si R2 no está configurado o algo falla
// (mejor una foto enlazada que ninguna).
export async function storeImage(sourceUrl, productId) {
    const r2 = config();
    if (!r2 || !sourceUrl || isStored(sourceUrl)) return sourceUrl;

    try {
        const response = await fetch(sourceUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; FitoPriceBot/1.0)" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const extension = EXTENSIONS[type];
        if (!extension) throw new Error(`no es una imagen (${type || "sin tipo"})`);

        const body = Buffer.from(await response.arrayBuffer());
        if (body.length > MAX_BYTES) throw new Error(`demasiado grande (${body.length} bytes)`);

        const key = `products/${productId}.${extension}`;
        const upload = await r2.client.fetch(`${r2.endpoint}/${key}`, {
            method: "PUT",
            body,
            headers: {
                "Content-Type": type,
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
