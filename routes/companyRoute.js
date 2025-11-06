import express from "express";
import { getCompanies, addCompany, getCompaniesByProduct } from "../controllers/companyController.js";

const router = express.Router();

router.get("/all", getCompanies);
router.post("/add", addCompany);
router.get("/:productId", getCompaniesByProduct);

export default router;