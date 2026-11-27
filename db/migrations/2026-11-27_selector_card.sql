-- Para bases de datos creadas antes de añadir selector_card (el volumen de Docker
-- no vuelve a ejecutar 01_schema.sql). Se puede lanzar varias veces.
--   docker exec -i fitoprice-db psql -U fitoprice -d fitoprice < db/migrations/2026-11-27_selector_card.sql
ALTER TABLE scraping_config ADD COLUMN IF NOT EXISTS selector_card text;

UPDATE scraping_config SET selector_card = 'li.product',
                           selector_link = 'a.woocommerce-LoopProduct-link'
WHERE company_url_id = 6 AND selector_card IS NULL;

UPDATE scraping_config SET selector_card = '.js-product-miniature',
                           selector_title = '.product-title'
WHERE company_url_id IN (12, 13) AND selector_card IS NULL;
