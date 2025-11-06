import express from "express";
import { importProducts, getAllProducts, getProductById, getLastProductPrice, getHistoryProductPrice, getLastScrapedAt } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);
router.get("/:id", getProductById);
router.get("/:id/last-price", getLastProductPrice);
router.get("/:id/price-history", getHistoryProductPrice);
router.get("/last-scraped", getLastScrapedAt);

export default router;