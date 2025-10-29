import express from 'express';
import cors from 'cors';
import scrapingRouter from './routes/scraping.js';

const app = express();

app.use(cors());
app.use(express.json());

// Test endpoint básico
app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

// Rutas
app.use('/scraping', scrapingRouter);

export default app;