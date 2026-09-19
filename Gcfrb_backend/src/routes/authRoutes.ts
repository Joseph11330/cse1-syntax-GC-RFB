import { Router } from 'express';
import {
    studentLogin,
    studentMe,
    studentLogout,
} from '../controllers/studentAuth';
import {
    adminLogin,
    adminMe,
    adminLogout,
} from '../controllers/adminAuth';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/student/login', studentLogin);
router.get('/student/me', requireAuth, studentMe);
router.post('/student/logout', requireAuth, studentLogout);

router.post('/admin/login', adminLogin);
router.get('/admin/me', requireAuth, adminMe);
router.post('/admin/logout', requireAuth, adminLogout);

export default router;