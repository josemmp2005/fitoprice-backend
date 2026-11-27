// Datos que se sacan del nombre del producto, porque las tiendas no los dan aparte:
// tamaño del envase, tipo de producto y materias activas o nutrientes principales.
// Es una aproximación por palabras clave: si una tienda cambia sus nombres, revisa las reglas.
// Tras cambiar las reglas: `npm run enrich` recalcula todos los productos.

// Minúsculas y sin tildes, para comparar
export const normalize = (text) =>
    String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "5L", "250Ml", "250cc", "25KG", "5 Kgs", "50GR", "10Lt", "5 Litros" -> { amount, unit } en L o kg
const PACK = /(\d+(?:[.,]\d+)?)\s?(litros?|lts?|l|ml|cc|kilos?|kgs?|grs?|gr|g)(?![a-z])/i;

export function parsePack(name) {
    const match = normalize(name).match(PACK);
    if (!match) return null;
    const value = parseFloat(match[1].replace(",", "."));
    if (!(value > 0)) return null;
    const unit = match[2];
    if (unit === "ml" || unit === "cc") return { amount: value / 1000, unit: "L" };
    if (unit.startsWith("l")) return { amount: value, unit: "L" };
    if (unit.startsWith("k")) return { amount: value, unit: "kg" };
    return { amount: value / 1000, unit: "kg" }; // g, gr, grs
}

// Algunas tiendas (FertiTienda) dan el precio por litro o kilo: "22,00 € por litro".
// Devuelve "L" o "kg" si el texto del precio es por unidad, o null si es el precio del envase.
export function priceUnitOf(priceText) {
    const match = normalize(priceText).match(/\bpor\s+(litros?|l|kilos?|kgs?)\b/);
    if (!match) return null;
    return match[1].startsWith("l") ? "L" : "kg";
}

// Precio del envase a partir del precio por litro o kilo y el envase del nombre.
// null si el nombre no dice el envase o lo da en otra unidad: entonces no se sabe lo que cuesta.
export function packPrice(name, unitPrice, unit) {
    const pack = parsePack(name);
    if (!pack || pack.unit !== unit) return null;
    return Math.round(unitPrice * pack.amount);
}

// Tipos de producto, en orden de prioridad: gana la primera regla que encaja.
// "Azufre - Acaricida fungicida" es fungicida; "Jabón potásico" es insecticida, no abono.
export const PRODUCT_TYPES = [
    { type: "Fungicidas y bactericidas", match: /fungicid|fungica|mildiu|oidio|botrytis|hongos|bactericid|tetraconazol|oxicloruro|sulfato de cobre|cuprico|\bazufre\b|\bsulf\b/ },
    { type: "Insecticidas y acaricidas", match: /insecticid|acaricid|parafina|cipermetrin|deltametrin|piretrin|pelitre|abamectin|thuringiensis|acetamiprid|piriproxifen|fluvalinato|hexitiazox|caracoles|gusano|pulgon|arana roja|diatomeas|jabon/ },
    { type: "Nematicidas", match: /nematodo/ },
    { type: "Herbicidas", match: /herbicid|glifosato|acido acetico/ },
    { type: "Coadyuvantes y limpieza", match: /mojante|corrector ph|dureza del agua|limpiador|cleaner|desinfectante|permanganato/ },
    { type: "Bioestimulantes", match: /bioestimul|bioactiv|aminoacid|algas|alginico|humicos|fulvicos|enraizante|activador|microorganismos|azotobacter|fijacion|fortificante|maduracion|floracion|cuajado|llenado|estres|radicular/ },
    { type: "Abonos y correctores", match: /abono|quelato|hierro|zinc|manganeso|magnesio|boro|molibdeno|calcio|potas|fosfor|fosfato|nitrogeno|silicio|micronutrientes|carencias|materia organica|humus|suelo|cobre|\b(npk|pk|nk|zn|mn|mg|fe|ca|cab|cu|mo|k|b)\b|\d+-\d+-\d+/ },
];

export function productType(name) {
    const text = normalize(name);
    return PRODUCT_TYPES.find((rule) => rule.match.test(text))?.type ?? "Otros";
}

// Materias activas y nutrientes. Un producto puede tener varios ("Azufre cúprico": azufre y cobre).
// Sirven para proponer alternativas: productos que comparten alguno.
const ACTIVES = [
    { name: "Cobre", match: /cobre|cuprico|oxicloruro|\bcu\b/ },
    { name: "Azufre", match: /\bazufre\b|\bsulf\b|sulfiser/ },
    { name: "Aceite de parafina", match: /parafina/ },
    { name: "Cipermetrina", match: /cipermetrin/ },
    { name: "Deltametrina", match: /deltametrin/ },
    { name: "Piretrinas", match: /piretrin|pelitre/ },
    { name: "Abamectina", match: /abamectin/ },
    { name: "Bacillus thuringiensis", match: /thuringiensis/ },
    { name: "Acetamiprid", match: /acetamiprid/ },
    { name: "Piriproxifen", match: /piriproxifen/ },
    { name: "Tau-fluvalinato", match: /fluvalinato/ },
    { name: "Hexitiazox", match: /hexitiazox/ },
    { name: "Tetraconazol", match: /tetraconazol/ },
    { name: "Jabón potásico", match: /jabon (potasico|negro)|jabon .*potasico/ },
    { name: "Tierra de diatomeas", match: /diatomeas/ },
    { name: "Hierro", match: /hierro|\bfe\b/ },
    { name: "Zinc", match: /zinc|\bzn\b|zn\+|znmn/ },
    { name: "Manganeso", match: /manganeso|\bmn\b|mn zn|znmn/ },
    { name: "Magnesio", match: /magnesio|\bmg\b/ },
    { name: "Boro", match: /boro\b|\bb\b|-b\b|cab\b/ },
    { name: "Molibdeno", match: /molibdeno|\bmo\b|moly/ },
    { name: "Calcio", match: /calcio|\bca\b|cab\b|cap\b/ },
    { name: "Potasio", match: /potasi|potasa|\bk2o\b|\bk\b/, unless: /jabon|permanganato/ },
    { name: "Fósforo", match: /fosforo|fosfato|\bpk\b/, unless: /jabon/ },
    { name: "Nitrógeno", match: /nitrogeno/ },
    { name: "Silicio", match: /silicio/ },
    { name: "Aminoácidos", match: /aminoacid/ },
    { name: "Algas", match: /algas|alginico/ },
    { name: "Ácidos húmicos", match: /humicos|fulvicos/ },
    { name: "NPK", match: /\bnpk\b|\d+-\d+-\d+/ },
    { name: "Mojante", match: /mojante/ },
];

export function activeIngredients(name) {
    const text = normalize(name);
    return ACTIVES
        .filter((a) => a.match.test(text) && !(a.unless && a.unless.test(text)))
        .map((a) => a.name);
}

export function productInfo(name) {
    const pack = parsePack(name);
    return {
        pack_amount: pack?.amount ?? null,
        unit: pack?.unit ?? null,
        category: productType(name),
        active_ingredients: activeIngredients(name),
    };
}
