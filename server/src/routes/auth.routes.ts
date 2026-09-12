import { Router, Request, Response } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/role';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', authenticate, getMe);

router.get('/admin-test', authenticate, authorizeRoles('ADMIN'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Admin access granted' });
});

router.get('/operations-test', authenticate, authorizeRoles('ADMIN', 'OPERATIONS'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Operations access granted' });
});

router.get('/sales-test', authenticate, authorizeRoles('ADMIN', 'SALES'), (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sales access granted' });
});

export default router;
