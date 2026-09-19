import './types';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import studentRoutes from './routes/studentRoutes';
import adminRoutes from './routes/adminRoutes';
import roomRoutes from './routes/roomRoutes';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', roomRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));