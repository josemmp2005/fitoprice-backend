import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import productRoutes from "./routes/productRoutes.js";
import companyRoute from "./routes/companyRoute.js";
import scrapingRoutes from "./routes/scrapingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import registryRoutes from "./routes/registryRoutes.js";

dotenv.config();

const app = express();

// Orígenes que pueden llamar a la API: los de CORS_ORIGINS (separados por comas) o, si no hay, local y Netlify
const origins = (process.env.CORS_ORIGINS || "http://localhost:5173,https://fitoprice.netlify.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));

// El registro oficial lleva su propio límite de tamaño, así que va antes del parser general
app.use("/registry", registryRoutes);

// n8n manda todos los precios de una lectura en una sola petición (~200 kB con 600 productos).
// Vercel corta las peticiones de más de 4,5 MB, así que no tiene sentido pasar de ahí.
app.use(express.json({ limit: "4mb" }));

// Rutas
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/companies", companyRoute);
app.use("/scraping", scrapingRoutes);


// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

// Exportar app para Vercel (api/index.js) y para server.js en local
export default app;
