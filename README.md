#  FitoPrice Backend
Este repositorio contiene el **backend de FitoPrice**, encargado de gestionar los datos, la autenticación y las operaciones relacionadas con productos, empresas y precios agrícolas.
Desarrollado con **ExpressJs** sobre **PostgreSQL**, este backend actúa como fuente de datos central para el **frontend** y para los flujos automáticos de **n8n**.

---

##  Descripción General

El backend de FitoPrice proporciona una API para:

-  Gestionar información de productos agrícolas, empresas y precios.  
-  Autenticar y autorizar usuarios administrativos.  
-  Servir datos históricos para el análisis en el frontend.  
-  Recibir actualizaciones automáticas de scraping desde n8n.  

---

## 🧩 Tecnologías Principales
-  **Express (NodeJs)** — Framework backend ligero para crear y gestionar endpoints RESTful.  
-  **PostgreSQL** — Base de datos relacional con funciones, triggers y roles.  
-  **JWT + bcrypt** — Autenticación de administradores.  
-  **Render** — Entorno de despliegue y automatización.

---

## Arranque en local

Requisitos: Docker Desktop y Node.js.

```bash
cp .env.example .env     # solo la primera vez: pon valores largos y aleatorios en JWT_SECRET y SCRAPER_API_KEY
docker compose up -d     # PostgreSQL en localhost:5434 y n8n en http://localhost:5678
npm install
npm start                # API en http://localhost:3000
```

El frontend se arranca desde su carpeta con `npm install` y `npm run dev` (http://localhost:5173),
con `VITE_API_URL=http://localhost:3000` en su `.env`.

Administrador de desarrollo: `admin@fitoprice.local` / `admin1234`.

### Base de datos

- `db/01_schema.sql` crea las tablas y `db/02_seed.sql` el admin, las empresas y las URLs a raspar.
- Ambos se ejecutan solo cuando el volumen está vacío.
- Bases de datos creadas antes de un cambio de esquema: aplica los scripts de `db/migrations/`
  (cada uno indica el comando).
- Consola SQL: `docker exec -it fitoprice-db psql -U fitoprice -d fitoprice`
- Reiniciar desde cero (**borra todos los datos**): `docker compose down -v && docker compose up -d`

### Scraping (precios)

Cada lectura añade un precio por producto, y de ahí sale el histórico.

- **Automático, con n8n:** el contenedor `fitoprice-n8n` ejecuta el workflow de `../FitoPrice-n8n`
  todos los días a las 7:00 (hora de Madrid). El README de ese repositorio explica cómo importarlo.
  n8n solo habla con la API:
  - `GET /scraping/jobs`: páginas activas con sus selectores.
  - `POST /products/import`: guarda los precios.

  Las dos rutas piden la cabecera `X-API-Key` con el valor de `SCRAPER_API_KEY`
  (o el token de un administrador). docker-compose pasa esa clave a n8n desde `.env`.
- **A mano:** `npm run scrape` (o `npm run scrape -- --dry` para probar sin guardar). Lee las mismas
  páginas con los mismos selectores y guarda con el mismo importador. Sirve para probar selectores
  nuevos sin abrir n8n. Con `--company=ID` lee solo esa empresa, para estrenar una tienda nueva sin
  añadir otra lectura del día a las demás (`npm run scrape -- --company=4`).

Tiendas: Agricoal (1), FertiecoAgro (3) y FertiTienda (4), en `db/02_seed.sql`. FertiTienda se añadió
después: en una base ya creada, aplica `db/migrations/2026-11-27_fertitienda.sql`.

**Precios por litro o kilo.** FertiTienda da muchos precios por unidad ("22,00 € por litro", con
compra mínima de 5 en un envase de 5 L). El scraper lo detecta en el texto del precio y lo envía en
`price_unit` ("L" o "kg"); la API lo multiplica por el envase del nombre (5 L → 110 €). Si el nombre
no dice el envase en esa unidad, descarta el producto y lo devuelve en `errors`.

### Datos sacados del nombre

Las tiendas no dan aparte el envase, el tipo ni la materia activa, así que se deducen del nombre
con las reglas de `lib/productInfo.js`. Por ejemplo, "Cipergen 1L - Cipermetrina" da 1 L,
"Insecticidas y acaricidas" y "Cipermetrina". Con eso la API calcula el precio por litro o kilo
(`price_per_unit`) y las alternativas (`GET /products/:id/alternatives`).
Los productos nuevos se calculan al importarlos. Si cambias las reglas, ejecuta `npm run enrich`
para recalcular todos.

### Registro oficial de fitosanitarios

El workflow de n8n "registro oficial" descarga cada sábado a las 6:00 el listado de productos autorizados
del Ministerio de Agricultura y lo envía por lotes a `POST /registry/import` (con `X-API-Key`).
- La API lo guarda en `registry_products`: número de registro, nombres comerciales, titular, composición y
  usos por cultivo, con dosis y plazo de seguridad.
- En el último lote borra los productos que ya no están autorizados.
- Después enlaza cada producto de las tiendas con su registro por el nombre comercial (`lib/registryMatch.js`).
  Si hay dudas, no lo enlaza.

Se vuelve a enlazar al importar productos nuevos y con `npm run enrich`.
Endpoints: `GET /products/:id/registry` (datos oficiales del producto) y `GET /registry/status`.

Los selectores se editan en el panel (Admin > Scraping). El de **ficha de producto** marca el bloque
de cada producto y los demás se buscan dentro de él; n8n salta las páginas que no lo tienen.
