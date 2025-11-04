import express from "express";
import { importProducts, getAllProducts, getProductById } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

export default router;