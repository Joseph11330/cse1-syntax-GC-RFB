import { Router } from 'express';
import { adminLogin, userLogin } from '../controllers/authController';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);

export default router;