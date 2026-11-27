import express from "express";
import { importProducts, getAllProducts, getfifteenProducts, getProductById, getLastProductPrice, getHistoryProductPrice, getLastScrapedAt, getCountProducts, getProductAlternatives } from "../controllers/productController.js";
import { requireScraperKey } from "../middlewares/authMiddleware.js";
import { getProductRegistry } from "../controllers/registryController.js";


const router = express.Router();

// Solo n8n (cabecera X-API-Key) o un administrador pueden guardar precios
router.post("/import", requireScraperKey, importProducts);
router.get("/all", getAllProducts);
router.get("/fifteen", getfifteenProducts);
router.get("/last-scraped", getLastScrapedAt);
router.get("/count", getCountProducts);
router.get("/:id", getProductById);
router.get("/:id/last-price", getLastProductPrice);
router.get("/:id/price-history", getHistoryProductPrice);
router.get("/:id/alternatives", getProductAlternatives);
router.get("/:id/registry", getProductRegistry);

export default router;