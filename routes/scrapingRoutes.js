import express from "express";
import { createNewScrapingJob } from "../controllers/scrapingController.js";


const router = express.Router();

router.post("/scraping-job", createNewScrapingJob);


export default router;