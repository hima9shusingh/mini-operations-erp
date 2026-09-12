import { Router } from 'express';
import { 
  createWorkOrder, 
  getWorkOrders, 
  getWorkOrderById, 
  updateWorkOrderStatus 
} from '../controllers/work-order.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// Protect all routes
router.use(authenticate);

// List and View routes (ADMIN, OPERATIONS, SALES)
router.get('/', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getWorkOrders);
router.get('/:id', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getWorkOrderById);

// Create route (ADMIN only)
router.post('/', authorizeRoles('ADMIN'), createWorkOrder);

// Update status (ADMIN only)
router.patch('/:id/status', authorizeRoles('ADMIN'), updateWorkOrderStatus);

export default router;
