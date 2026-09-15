import { Router } from 'express';

import {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking
} from '../controllers/bookingController';

import {
  authenticateToken
} from '../middleware/authMiddleware';

const router = Router();


// Availability
router.get(
  '/availability',
  authenticateToken,
  checkAvailability
);


// Create booking
router.post(
  '/',
  authenticateToken,
  createBooking
);


// My bookings
router.get(
  '/my',
  authenticateToken,
  getMyBookings
);


// Specific booking
router.get(
  '/:id',
  authenticateToken,
  getBookingById
);


// Cancel booking
router.delete(
  '/:id',
  authenticateToken,
  cancelBooking
);

export default router;