import { Router } from 'express';
import { 
  createInventory, 
  getInventoryList, 
  getInventoryById, 
  updateInventory, 
  deleteInventory 
} from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// Protect all routes
router.use(authenticate);

// View routes (ADMIN, OPERATIONS, SALES)
router.get('/', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getInventoryList);
router.get('/:id', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getInventoryById);

// Create / Update routes (ADMIN, OPERATIONS)
router.post('/', authorizeRoles('ADMIN', 'OPERATIONS'), createInventory);
router.put('/:id', authorizeRoles('ADMIN', 'OPERATIONS'), updateInventory);

// Delete route (ADMIN only)
router.delete('/:id', authorizeRoles('ADMIN'), deleteInventory);

export default router;
