-- Registro oficial de productos fitosanitarios (ver 01_schema.sql). Se puede lanzar varias veces.
--   docker exec -i fitoprice-db psql -U fitoprice -d fitoprice < db/migrations/2026-11-27_registry.sql
CREATE TABLE IF NOT EXISTS registry_products (
    num_registro     text PRIMARY KEY,
    nombre           text NOT NULL,
    nombres          text[] NOT NULL DEFAULT '{}',
    titular          text,
    formulado        text,
    estado           text,
    fecha_caducidad  text,
    composicion      jsonb NOT NULL DEFAULT '[]',
    usos             jsonb NOT NULL DEFAULT '[]',
    fecha_datos      date,
    updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS registry_num text REFERENCES registry_products (num_registro) ON DELETE SET NULL;
