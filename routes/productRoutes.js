import express from "express";
import { importProducts } from "../controllers/productController.js";

const router = express.Router();

router.post("/import", importProducts);

export default router;