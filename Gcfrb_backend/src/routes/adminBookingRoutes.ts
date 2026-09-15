import { Router } from 'express';

import {
  getAllBookings,
  getAdminBookingById,
  approveBooking,
  rejectBooking,
  cancelBookingByAdmin
} from '../controllers/adminBookingController';

import {
  authenticateToken,
  requireAdmin
} from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', getAllBookings);
router.get('/:id', getAdminBookingById);

router.put('/:id/approve', approveBooking);
router.put('/:id/reject', rejectBooking);
router.put('/:id/cancel', cancelBookingByAdmin);

export default router;