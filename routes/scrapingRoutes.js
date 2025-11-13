import express from "express";
import { createNewScrapingJob, updateScrapingJob } from "../controllers/scrapingController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";



const router = express.Router();

router.post("/scraping-job", requireAuth, createNewScrapingJob);
router.put("/scraping-job/:jobId", requireAuth, updateScrapingJob);


export default router;