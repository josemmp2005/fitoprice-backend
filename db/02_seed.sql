-- Datos iniciales para desarrollo local.
-- Los productos y precios se cargan raspando las webs: `npm run scrape`.

-- Administrador local: admin@fitoprice.local / admin1234
INSERT INTO users (email, password_hash)
VALUES ('admin@fitoprice.local', crypt('admin1234', gen_salt('bf', 10)));

-- Empresas (mismos ids que usa el workflow de n8n)
INSERT INTO companies (id, name, website) VALUES
    (1, 'Agricoal',     'https://www.agricoal.es/'),
    (3, 'FertiecoAgro', 'https://fertiecoagro.es/'),
    (4, 'FertiTienda',  'https://fertitienda.com/');

-- Páginas a raspar. Los selectores originales se perdieron; estos se sacaron
-- de las webs en noviembre de 2026 y habrá que revisarlos si cambian de diseño.
INSERT INTO company_urls (id, company_id, url, active) VALUES
    (6,  3, 'https://fertiecoagro.es/productos/', true),                            -- WooCommerce, paginado
    (12, 1, 'https://www.agricoal.es/3-fitosanitarios?resultsPerPage=200', true),   -- PrestaShop
    (13, 1, 'https://www.agricoal.es/6-fertilizantes?resultsPerPage=200', true),
    -- FertiTienda (PrestaShop): muchos precios vienen por litro o kilo y el importador los pasa a precio del envase
    (14, 4, 'https://fertitienda.com/fungicidas/?resultsPerPage=200', true),
    (15, 4, 'https://fertitienda.com/insecticida/?resultsPerPage=200', true),
    (16, 4, 'https://fertitienda.com/acaricida/?resultsPerPage=200', true),
    (17, 4, 'https://fertitienda.com/herbicida/?resultsPerPage=200', true),
    (18, 4, 'https://fertitienda.com/abono/?resultsPerPage=200', true),
    (19, 4, 'https://fertitienda.com/abono-foliar/?resultsPerPage=200', true);

-- selector_card es la ficha de cada producto; el resto de selectores se buscan dentro de ella
INSERT INTO scraping_config (company_url_id, selector_card, selector_title, selector_price, selector_image, selector_link) VALUES
    (6,  'li.product',            '.woocommerce-loop-product__title', '.price', '.woocommerce-loop-image-link img', 'a.woocommerce-LoopProduct-link'),
    (12, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (13, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (14, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (15, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (16, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (17, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (18, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a'),
    (19, '.js-product-miniature', '.product-title',                   '.price', '.product-thumbnail img',           '.product-title a');

-- Ajustar las secuencias tras insertar ids explícitos
SELECT setval(pg_get_serial_sequence('companies', 'id'),    (SELECT max(id) FROM companies));
SELECT setval(pg_get_serial_sequence('company_urls', 'id'), (SELECT max(id) FROM company_urls));
