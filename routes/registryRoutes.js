import express from "express";
import { getRegistryStatus, importRegistry } from "../controllers/registryController.js";
import { requireScraperKey } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Lotes del registro oficial desde n8n: pueden pesar varios MB
router.post("/import", requireScraperKey, express.json({ limit: "25mb" }), importRegistry);
router.get("/status", getRegistryStatus);

export default router;
