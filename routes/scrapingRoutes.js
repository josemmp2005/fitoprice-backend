import express from "express";
import { createNewScrapingJob, getActiveJobs, updateScrapingJob } from "../controllers/scrapingController.js";
import { requireAuth, requireScraperKey } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Páginas activas con sus selectores, en una lista plana: la lee el workflow de n8n
router.get("/jobs", requireScraperKey, getActiveJobs);
router.post("/scraping-job", requireAuth, createNewScrapingJob);
router.put("/scraping-job/:jobId", requireAuth, updateScrapingJob);

export default router;
