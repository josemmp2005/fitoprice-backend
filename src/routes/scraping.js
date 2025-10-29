import express from 'express';
import { importProducts } from '../controllers/scrapingController.js';

const router = express.Router();

// Endpoint para recibir JSON desde n8n
router.post('/import', importProducts);

export default router;