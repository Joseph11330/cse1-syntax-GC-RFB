import { Router } from 'express';
import {
    listRooms,
    getRoom,
    listAddons,
    createReservation,
    listMyReservations,
    getReservation,
    cancelReservation,
} from '../controllers/roomReservation';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/rooms', requireAuth, listRooms);
router.get('/rooms/:id', requireAuth, getRoom);
router.get('/addons', requireAuth, listAddons);

router.post('/reservations', requireAuth, requireRole('student'), createReservation);
router.get('/reservations', requireAuth, requireRole('student'), listMyReservations);
router.get('/reservations/:id', requireAuth, getReservation);
router.delete('/reservations/:id', requireAuth, requireRole('student'), cancelReservation);

export default router;