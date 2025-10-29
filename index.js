import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "https://tudominio.com"],
    credentials: true,
}));

app.use(express.json());

// Rutas
app.use("/products", productRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

// Exportar app para Vercel
export default app;