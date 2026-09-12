import { Router } from 'express';
import { 
  createCustomerOrder, 
  getCustomerOrders, 
  getCustomerOrderById, 
  cancelCustomerOrder 
} from '../controllers/customer-order.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// Protect all routes
router.use(authenticate);

// View routes (ADMIN, OPERATIONS, SALES)
router.get('/', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getCustomerOrders);
router.get('/:id', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getCustomerOrderById);

// Create route (SALES only)
router.post('/', authorizeRoles('SALES'), createCustomerOrder);

// Cancel route (SALES only)
router.patch('/:id/cancel', authorizeRoles('SALES'), cancelCustomerOrder);

export default router;
