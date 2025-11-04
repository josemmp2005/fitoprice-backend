import express from "express";
import { importProducts, getAllProducts } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);
router.get("/all", getAllProducts);

export default router;