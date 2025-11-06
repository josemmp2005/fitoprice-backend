import express from "express";
import { importProducts, getAllProducts, getfifteenProducts, getProductById, getLastProductPrice, getHistoryProductPrice, getLastScrapedAt, getCountProducts } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);
router.get("/fifteen", getfifteenProducts);
router.get("/last-scraped", getLastScrapedAt);
router.get("/count", getCountProducts);
router.get("/:id", getProductById);
router.get("/:id/last-price", getLastProductPrice);
router.get("/:id/price-history", getHistoryProductPrice);

export default router;