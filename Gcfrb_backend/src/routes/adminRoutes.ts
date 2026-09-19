import { Router } from 'express';
import { adminLogin, adminMe, adminLogout } from '../controllers/adminAuth';
import {
    getAdminDashboard,
    listPendingReservations,
    approveReservation,
    rejectReservation,
} from '../controllers/adminDashboard';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', adminLogin);
router.get('/me', requireAuth, adminMe);
router.post('/logout', requireAuth, adminLogout);

router.get('/dashboard', requireAuth, requireRole('admin'), getAdminDashboard);
router.get('/reservations/pending', requireAuth, requireRole('admin'), listPendingReservations);
router.patch('/reservations/:id/approve', requireAuth, requireRole('admin'), approveReservation);
router.patch('/reservations/:id/reject', requireAuth, requireRole('admin'), rejectReservation);

export default router;