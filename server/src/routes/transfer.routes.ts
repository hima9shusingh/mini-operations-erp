import { Router } from 'express';
import { 
  createTransfer, 
  getTransfers, 
  getTransferById, 
  dispatchTransfer,
  receiveTransfer
} from '../controllers/transfer.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

// Protect all routes
router.use(authenticate);

// List and View routes (ADMIN, OPERATIONS, SALES)
router.get('/', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getTransfers);
router.get('/:id', authorizeRoles('ADMIN', 'OPERATIONS', 'SALES'), getTransferById);

// Create route (ADMIN, OPERATIONS)
router.post('/', authorizeRoles('ADMIN', 'OPERATIONS'), createTransfer);

// Dispatch and Receive routes (ADMIN, OPERATIONS)
router.patch('/:id/dispatch', authorizeRoles('ADMIN', 'OPERATIONS'), dispatchTransfer);
router.patch('/:id/receive', authorizeRoles('ADMIN', 'OPERATIONS'), receiveTransfer);

export default router;
