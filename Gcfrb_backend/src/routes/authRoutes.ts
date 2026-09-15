import { Router, Response } from 'express';
import { adminLogin, userLogin } from '../controllers/authController';

import { 
    authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);

router.get('/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ 
        message: 'Protected route accessed successfully', 
        token_data: req.user });
});

export default router;