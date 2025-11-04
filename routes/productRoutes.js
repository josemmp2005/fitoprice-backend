import express from "express";
import { importProducts, getAllProducts, getProductById, getLastProductPrice, getHistoryProductPrice } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);
router.get("/:id", getProductById);
router.get("/:id/last-price", getLastProductPrice);
router.get("/:id/price-history", getHistoryProductPrice);

export default router;