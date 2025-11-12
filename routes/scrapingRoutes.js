import express from "express";
import { createNewScrapingJob, updateScrapingJob } from "../controllers/scrapingController.js";


const router = express.Router();

router.post("/scraping-job", createNewScrapingJob);
router.put("/scraping-job/:jobId", updateScrapingJob);


export default router;