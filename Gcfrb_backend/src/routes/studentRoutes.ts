import { Router } from 'express';
import {
    studentSignup,
    studentLogin,
    studentMe,
    studentLogout,
} from '../controllers/studentAuth';
import {
    getStudentDashboard,
    listMyBookings,
    cancelMyBooking,
} from '../controllers/studentDashboard';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', studentSignup);
router.post('/login', studentLogin);
router.get('/me', requireAuth, studentMe);
router.post('/logout', requireAuth, studentLogout);

router.get('/dashboard', requireAuth, requireRole('student'), getStudentDashboard);
router.get('/bookings', requireAuth, requireRole('student'), listMyBookings);
router.delete('/bookings/:id', requireAuth, requireRole('student'), cancelMyBooking);

export default router;