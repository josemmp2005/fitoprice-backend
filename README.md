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
-  Guardar el Registro Oficial de Productos Fitosanitarios y enlazarlo con los productos.
-  Copiar las fotos de los productos a Cloudflare R2.

---

## 🧩 Tecnologías Principales
-  **Express (NodeJs)** — Framework backend ligero para crear y gestionar endpoints RESTful.
-  **PostgreSQL** — En local con Docker; en producción en **Neon** (PostgreSQL serverless).
-  **JWT + bcrypt** — Autenticación de administradores.
-  **Cloudflare R2** — Almacenamiento de las fotos de los productos (compatible con S3, firmado con `aws4fetch`).
-  **Vercel** — Despliegue de la API como función serverless.

| Entorno | API | Base de datos | Fotos | Scraping |
|---|---|---|---|---|
| Local | `npm start` (http://localhost:3000) | PostgreSQL en Docker (`localhost:5434`) | enlazadas desde cada tienda | n8n en Docker |
| Producción | Vercel | Neon | Cloudflare R2 | n8n en GitHub Actions |

---

## Arranque en local

Requisitos: Docker Desktop y Node.js 20 o superior.

```bash
cp .env.example .env     # solo la primera vez: pon valores largos y aleatorios en JWT_SECRET y SCRAPER_API_KEY
docker compose up -d     # PostgreSQL en localhost:5434 y n8n en http://localhost:5678
npm install
npm start                # API en http://localhost:3000
```

El frontend se arranca desde su carpeta con `npm install` y `npm run dev` (http://localhost:5173),
con `VITE_API_URL=http://localhost:3000` en su `.env`.

Administrador de desarrollo: `admin@fitoprice.local` / `admin1234`.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca la API (`server.js`) |
| `npm run scrape` | Lee los precios de las tiendas y los guarda (`-- --dry` sin guardar, `-- --company=ID` solo una tienda) |
| `npm run enrich` | Recalcula envase, tipo y materias activas de todos los productos y los vuelve a enlazar con el registro |
| `npm run images` | Copia a Cloudflare R2 las fotos que aún apuntan a la tienda (`-- --dry` solo cuenta) |
| `npm run db:neon` | Copia la base de datos local (esquema, datos e histórico) a Neon |

### Variables de entorno

Están todas en `.env.example`, con comentarios.

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL. En Vercel, la cadena *pooled* de Neon |
| `NEON_DATABASE_URL` | Solo para `npm run db:neon`: la cadena *directa* de Neon |
| `JWT_SECRET` | Firma de las sesiones de administrador |
| `SCRAPER_API_KEY` | Clave con la que n8n llama a la API (cabecera `X-API-Key`) |
| `CORS_ORIGINS` | Webs que pueden llamar a la API, separadas por comas |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Fotos en Cloudflare R2 (opcionales en local) |
| `PORT` | Puerto en local (3000) |

### Base de datos

- `db/01_schema.sql` crea las tablas y `db/02_seed.sql` el admin, las empresas y las URLs a raspar.
- Ambos se ejecutan solo cuando el volumen está vacío.
- Bases de datos creadas antes de un cambio de esquema: aplica los scripts de `db/migrations/`
  (cada uno indica el comando).
- Consola SQL: `docker exec -it fitoprice-db psql -U fitoprice -d fitoprice`
- Reiniciar desde cero (**borra todos los datos**): `docker compose down -v && docker compose up -d`

Tablas: `products`, `product_prices` (cada lectura, de ahí el histórico), `companies`, `company_urls` y
`scraping_config` (tiendas, páginas y selectores), `registry_products` (registro oficial) y `users` (administradores).

### Scraping (precios)

Cada lectura añade un precio por producto, y de ahí sale el histórico.

- **Automático, con n8n:** en local, el contenedor `fitoprice-n8n` ejecuta el workflow de `../FitoPrice-n8n`
  todos los días a las 7:00 (hora de Madrid); en producción lo lanza GitHub Actions. El README de ese
  repositorio explica los dos casos. n8n solo habla con la API:
  - `GET /scraping/jobs`: páginas activas con sus selectores.
  - `POST /products/import`: guarda los precios (hasta 4 MB por petición; una lectura de 600 productos ocupa ~200 kB).

  Las dos rutas piden la cabecera `X-API-Key` con el valor de `SCRAPER_API_KEY`
  (o el token de un administrador). docker-compose pasa esa clave a n8n desde `.env`.
- **A mano:** `npm run scrape` (o `npm run scrape -- --dry` para probar sin guardar). Lee las mismas
  páginas con los mismos selectores y guarda con el mismo importador. Sirve para probar selectores
  nuevos sin abrir n8n. Con `--company=ID` lee solo esa empresa, para estrenar una tienda nueva sin
  añadir otra lectura del día a las demás (`npm run scrape -- --company=4`).

Tiendas: Agricoal (1), FertiecoAgro (3) y FertiTienda (4), en `db/02_seed.sql`. FertiTienda se añadió
después: en una base ya creada, aplica `db/migrations/2026-11-27_fertitienda.sql`.

Los selectores se editan en el panel (Admin > Scraping). El de **ficha de producto** marca el bloque
de cada producto y los demás se buscan dentro de él; n8n salta las páginas que no lo tienen.

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

El workflow de n8n "registro oficial" descarga cada sábado el listado de productos autorizados
del Ministerio de Agricultura y lo envía por lotes a `POST /registry/import` (con `X-API-Key`).
- La API lo guarda en `registry_products`: número de registro, nombres comerciales, titular, composición y
  usos por cultivo, con dosis y plazo de seguridad.
- En el último lote borra los productos que ya no están autorizados.
- Después enlaza cada producto de las tiendas con su registro por el nombre comercial (`lib/registryMatch.js`).
  Si hay dudas, no lo enlaza.

Se vuelve a enlazar al importar productos nuevos y con `npm run enrich`.
Endpoints: `GET /products/:id/registry` (datos oficiales del producto) y `GET /registry/status`.

### Fotos de los productos (Cloudflare R2)

Las fotos se guardan en un bucket de R2 en vez de enlazarlas desde cada tienda: las tiendas cambian o
borran sus fotos, algunas no dejan enlazarlas desde otra web, y Neon tiene poco espacio, así que la
base de datos solo guarda la URL (`lib/imageStore.js`).

- Al **crear un producto**, la API descarga su foto y la sube como `products/<id>.<ext>`
  (con caché de un año). `products.product_img_url` pasa a ser la URL pública de R2.
- Si R2 no está configurado o la descarga falla, se queda la URL de la tienda: mejor una foto enlazada que ninguna.
- Las fotos que había antes de configurar R2 se copian con `npm run images` (se puede repetir: salta las copiadas).

---

## Despliegue

La API va en **Vercel**, la base de datos en **Neon** y las fotos en **Cloudflare R2**, todo en planes gratuitos.
La guía paso a paso, con el frontend y n8n, está en el repositorio principal:
[docs/DESPLIEGUE.md](https://github.com/josemmp2005/fitoprice/blob/main/docs/DESPLIEGUE.md).

Lo propio de este repositorio:

- `api/index.js` es la función de Vercel: exporta la misma app de Express que arranca `server.js` en local.
- `vercel.json` manda todas las rutas a esa función, la ejecuta en Fráncfort (`fra1`, cerca de Neon en
  `eu-central-1`) y le da hasta 60 s (la importación de una lectura completa tarda unos segundos).
- Vercel corta las peticiones de más de **4,5 MB**: los lotes del registro (menos de 2 MB) y una lectura de precios caben.
- `config/db.js` abre pocas conexiones por instancia cuando corre en Vercel; usa la cadena *pooled* de Neon.
- Para pasar los datos actuales a Neon: pon `NEON_DATABASE_URL` en `.env` y ejecuta `npm run db:neon`
  (usa `pg_dump` y `psql` del contenedor `fitoprice-db`, no hace falta instalar PostgreSQL). La base de datos ocupa ~12 MB,
  muy por debajo de los 0,5 GB del plan gratuito de Neon.
