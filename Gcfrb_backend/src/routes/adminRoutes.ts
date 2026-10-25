import { Router } from 'express';
import { adminLogin, adminMe, adminLogout } from '../controllers/adminAuth';
import {
    getAdminDashboard,
    getAdminReports,
    listPendingReservations,
    listAllBookings,
    approveReservation,
    rejectReservation,
} from '../controllers/adminDashboard';
import {
    createAdminBooking,
    createAdminRoom,
    removeAdminRoom,
    updateAdminRoom,
} from '../controllers/adminRooms';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', adminLogin);
router.get('/me', requireAuth, requireRole('admin'), adminMe);
router.post('/logout', requireAuth, requireRole('admin'), adminLogout);

router.get('/dashboard', requireAuth, requireRole('admin'), getAdminDashboard);
router.get('/reports', requireAuth, requireRole('admin'), getAdminReports);
router.get('/bookings', requireAuth, requireRole('admin'), listAllBookings);
router.post('/bookings', requireAuth, requireRole('admin'), createAdminBooking);
router.get('/reservations/pending', requireAuth, requireRole('admin'), listPendingReservations);
router.patch('/reservations/:id/approve', requireAuth, requireRole('admin'), approveReservation);
router.patch('/reservations/:id/reject', requireAuth, requireRole('admin'), rejectReservation);
router.post('/rooms', requireAuth, requireRole('admin'), createAdminRoom);
router.patch('/rooms/:id', requireAuth, requireRole('admin'), updateAdminRoom);
router.delete('/rooms/:id', requireAuth, requireRole('admin'), removeAdminRoom);

export default router;