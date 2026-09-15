import { Router } from 'express';

import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deactivateRoom
} from '../controllers/roomController';

import {
  authenticateToken,
  requireAdmin
} from '../middleware/authMiddleware';

const router = Router();


// Public/authenticated room viewing
router.get('/', getRooms);

router.get('/:id', getRoomById);


// Admin room management
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  createRoom
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  updateRoom
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  deactivateRoom
);

export default router;