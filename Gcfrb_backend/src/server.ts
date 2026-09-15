import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import adminBookingRoutes from './routes/adminBookingRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'Backend running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});