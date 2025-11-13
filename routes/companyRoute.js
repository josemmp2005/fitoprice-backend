import express from "express";
import { getCompanies, addCompany, getCompaniesByProduct, getScrapingConfigCompany, getScrapingConfigs } from "../controllers/companyController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/all", getCompanies);
// Proteger creación de empresas: requiere token de autenticación válido
router.post("/add", requireAuth, addCompany);
router.get("/scraping-config", requireAuth, getScrapingConfigs);
router.get("/:productId", getCompaniesByProduct);
router.get("/scraping-config/:companyId", requireAuth, getScrapingConfigCompany);

export default router;