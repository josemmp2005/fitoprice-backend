import express from "express";
import { importProducts, getAllProducts, getProductById, getLastProductPrice } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);
router.get("/:id", getProductById);
router.get("/:id/last-price", getLastProductPrice);

export default router;