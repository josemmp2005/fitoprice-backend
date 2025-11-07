import express from "express";
import { getCompanies, addCompany, getCompaniesByProduct, getScrapingConfigCompany, getScrapingConfigs } from "../controllers/companyController.js";

const router = express.Router();

router.get("/all", getCompanies);
router.post("/add", addCompany);
router.get("/scraping-config/", getScrapingConfigs);
router.get("/:productId", getCompaniesByProduct);
router.get("/scraping-config/:companyId", getScrapingConfigCompany);


export default router;