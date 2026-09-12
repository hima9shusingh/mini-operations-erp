import request from 'supertest';
import app from '../index';
import prisma from '../database/prisma';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

let salesToken = '';
let adminToken = '';

beforeAll(async () => {
  const pass = await bcrypt.hash('password', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin-inv@test.com', passwordHash: pass, role: 'ADMIN' } });
  adminToken = generateToken(admin.id, admin.role);

  const sales = await prisma.user.create({ data: { name: 'Sales', email: 'sales-inv@test.com', passwordHash: pass, role: 'SALES' } });
  salesToken = generateToken(sales.id, sales.role);
});

describe('Inventory & Work Order Tests', () => {
  it('Invalid inventory quantity is rejected', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        item: 'Some Item',
        category: 'Parts',
        location: 'Some Loc',
        batch: 'B1',
        physicalQuantity: -10 // Invalid
      });
    expect(res.status).toBe(400);
  });

  it('Work Order with invalid required quantity is rejected', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        location: 'Warehouse Test',
        item: 'Test Item',
        assignedUserId: 'some-id',
        requiredQuantity: -5 // Invalid
      });
    expect(res.status).toBe(400);
  });
});
