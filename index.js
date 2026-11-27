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

app.use(cors({
    origin: ["http://localhost:5173", "https://fitoprice.netlify.app"],
    credentials: true,
}));

// El registro oficial lleva su propio límite de tamaño, así que va antes del parser general (100 kB)
app.use("/registry", registryRoutes);

app.use(express.json());

// Rutas
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/companies", companyRoute);
app.use("/scraping", scrapingRoutes);


// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

// Exportar app para Vercel
export default app;