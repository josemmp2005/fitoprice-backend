-- Envase y materias activas sacados del nombre. Después de aplicarla, rellena los datos con
--   npm run enrich
--   docker exec -i fitoprice-db psql -U fitoprice -d fitoprice < db/migrations/2026-11-27_product_info.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_amount numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active_ingredients text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_active_ingredients_idx ON products USING gin (active_ingredients);
