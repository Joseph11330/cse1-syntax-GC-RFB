import { Router } from 'express';

import {
  getSchedules,
  getScheduleById,
  getRoomSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule
} from '../controllers/scheduleController';

import {
  authenticateToken,
  requireAdmin
} from '../middleware/authMiddleware';

const router = Router();


// View schedules
router.get('/', getSchedules);

router.get('/room/:roomId', getRoomSchedules);

router.get('/:id', getScheduleById);


// Admin schedule management
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  createSchedule
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  updateSchedule
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  deleteSchedule
);

export default router;