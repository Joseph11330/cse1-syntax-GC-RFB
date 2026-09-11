import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'Backend running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});