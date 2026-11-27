import { pool, query } from "../config/db.js";
import { matchRegistry } from "../lib/registryMatch.js";

// Recibe el registro oficial por lotes desde n8n:
// { fecha: "2026-11-23", last: bool, productos: [{ num_registro, nombre, nombres, titular, formulado,
//   estado, fecha_caducidad, composicion: [...], usos: [...] }] }
// En el último lote borra los registros que ya no vienen (productos cancelados) y vuelve a enlazar los productos.
export const importRegistry = async(req, res) => {
    const { fecha, productos, last } = req.body ?? {};
    if (!fecha || !Array.isArray(productos)) {
        return res.status(400).json({ error: "Faltan fecha o productos" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const p of productos) {
            if (!p.num_registro || !p.nombre) continue;
            await client.query(
                `INSERT INTO registry_products
                    (num_registro, nombre, nombres, titular, formulado, estado, fecha_caducidad, composicion, usos, fecha_datos, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
                 ON CONFLICT (num_registro) DO UPDATE SET
                    nombre = EXCLUDED.nombre, nombres = EXCLUDED.nombres, titular = EXCLUDED.titular,
                    formulado = EXCLUDED.formulado, estado = EXCLUDED.estado, fecha_caducidad = EXCLUDED.fecha_caducidad,
                    composicion = EXCLUDED.composicion, usos = EXCLUDED.usos, fecha_datos = EXCLUDED.fecha_datos,
                    updated_at = now()`,
                [
                    String(p.num_registro), p.nombre, p.nombres ?? [], p.titular ?? null, p.formulado ?? null,
                    p.estado ?? null, p.fecha_caducidad ?? null,
                    JSON.stringify(p.composicion ?? []), JSON.stringify(p.usos ?? []), fecha,
                ]
            );
        }

        let removed = 0;
        if (last) {
            const result = await client.query("DELETE FROM registry_products WHERE fecha_datos < $1", [fecha]);
            removed = result.rowCount;
        }
        await client.query("COMMIT");

        const match = last ? await matchRegistry() : undefined;
        res.json({ status: "ok", saved: productos.length, removed, ...(match ?? {}) });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error al importar el registro oficial:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    } finally {
        client.release();
    }
};

// Datos oficiales del producto de la tienda, si está enlazado con el registro
export const getProductRegistry = async(req, res) => {
    try {
        const { rows } = await query(
            `SELECT r.*, r.fecha_datos::text AS fecha_datos FROM products p JOIN registry_products r ON r.num_registro = p.registry_num WHERE p.id = $1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "El producto no está enlazado con el registro" });
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener el registro del producto:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};

export const getRegistryStatus = async(req, res) => {
    try {
        const { rows } = await query(
            `SELECT (SELECT count(*)::int FROM registry_products) AS registry_products,
                    (SELECT max(fecha_datos)::text FROM registry_products) AS fecha_datos,
                    (SELECT count(*)::int FROM products WHERE registry_num IS NOT NULL) AS matched_products`
        );
        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener el estado del registro:", error);
        res.status(500).json({ error: "Error interno del servidor", details: error.message });
    }
};
