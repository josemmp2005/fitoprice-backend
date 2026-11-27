-- Añade FertiTienda (Almería, PrestaShop) a una base de datos ya creada.
-- En una base nueva ya la crea 02_seed.sql. Se puede lanzar varias veces.
--   docker exec -i fitoprice-db psql -U fitoprice -d fitoprice < db/migrations/2026-11-27_fertitienda.sql
-- FertiTienda da muchos precios por litro o kilo ("22,00 € por litro"): el importador
-- los pasa a precio del envase con el tamaño que pone el nombre (lib/productInfo.js).

INSERT INTO companies (id, name, website) VALUES (4, 'FertiTienda', 'https://fertitienda.com/')
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_urls (id, company_id, url, active) VALUES
    (14, 4, 'https://fertitienda.com/fungicidas/?resultsPerPage=200', true),
    (15, 4, 'https://fertitienda.com/insecticida/?resultsPerPage=200', true),
    (16, 4, 'https://fertitienda.com/acaricida/?resultsPerPage=200', true),
    (17, 4, 'https://fertitienda.com/herbicida/?resultsPerPage=200', true),
    (18, 4, 'https://fertitienda.com/abono/?resultsPerPage=200', true),
    (19, 4, 'https://fertitienda.com/abono-foliar/?resultsPerPage=200', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO scraping_config (company_url_id, selector_card, selector_title, selector_price, selector_image, selector_link)
SELECT id, '.js-product-miniature', '.product-title', '.price', '.product-thumbnail img', '.product-title a'
FROM company_urls WHERE id BETWEEN 14 AND 19
ON CONFLICT (company_url_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('companies', 'id'),    (SELECT max(id) FROM companies));
SELECT setval(pg_get_serial_sequence('company_urls', 'id'), (SELECT max(id) FROM company_urls));
