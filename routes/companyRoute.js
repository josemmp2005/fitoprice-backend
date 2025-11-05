import express from "express";
import { getCompanies } from "../controllers/companyController.js";

const router = express.Router();

router.get("/all", getCompanies);

export default router;