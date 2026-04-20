import express from 'express';
import cors from 'cors';
import capsuleRoutes from './routes/capsuleRoutes.js';

const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/capsules', capsuleRoutes);

export default app;
