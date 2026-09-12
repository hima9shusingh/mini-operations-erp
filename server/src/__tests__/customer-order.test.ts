import request from 'supertest';
import app from '../index';
import prisma from '../database/prisma';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

let salesToken = '';
let adminToken = '';
let testLocationId = '';
let testItemId = '';
let inventoryId = '';

beforeAll(async () => {
  const pass = await bcrypt.hash('password', 10);
  const sales = await prisma.user.create({
    data: { name: 'Sales', email: 'sales-co@test.com', passwordHash: pass, role: 'SALES' }
  });
  salesToken = generateToken(sales.id, sales.role);

  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin-co@test.com', passwordHash: pass, role: 'ADMIN' }
  });
  adminToken = generateToken(admin.id, admin.role);

  const loc = await prisma.location.create({
    data: { name: 'Warehouse Test', code: 'WT-01' }
  });
  testLocationId = loc.id;

  const item = await prisma.item.create({
    data: { name: 'Test Item', sku: 'TI-01', category: 'Parts' }
  });
  testItemId = item.id;
});

beforeEach(async () => {
  await prisma.customerOrder.deleteMany();
  await prisma.inventory.deleteMany();
  const inv = await prisma.inventory.create({
    data: {
      locationId: testLocationId,
      itemId: testItemId,
      batch: 'B1',
      physicalQuantity: 100,
      reservedQuantity: 80
    }
  });
  inventoryId = inv.id;
});

describe('Customer Order & Reservation Tests', () => {
  it('Cannot reserve more than available inventory (returns 400)', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Test Customer',
        location: 'Warehouse Test',
        item: 'Test Item',
        quantity: 30
      });

    expect(res.status).toBe(400);
    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(80);
  });

  it('Can reserve inventory if within limits', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Test Customer',
        location: 'Warehouse Test',
        item: 'Test Item',
        quantity: 15
      });

    expect(res.status).toBe(201);
    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(95);
  });

  it('Concurrent reservations handle properly', async () => {
    const req1 = request(app).post('/api/customer-orders').set('Authorization', `Bearer ${salesToken}`).send({ customerName: 'Test1', location: 'Warehouse Test', item: 'Test Item', quantity: 15 });
    const req2 = request(app).post('/api/customer-orders').set('Authorization', `Bearer ${salesToken}`).send({ customerName: 'Test2', location: 'Warehouse Test', item: 'Test Item', quantity: 15 });

    const results = await Promise.all([req1, req2]);
    const successCount = results.filter(r => r.status === 201).length;
    
    expect(successCount).toBe(1);
    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(95);
  });

  it('Unauthorized user (ADMIN) cannot create customer order', async () => {
    const res = await request(app)
      .post('/api/customer-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Test Customer',
        location: 'Warehouse Test',
        item: 'Test Item',
        quantity: 10
      });

    expect(res.status).toBe(403);
  });

  it('Cancelling a customer order releases reserved quantity', async () => {
    const orderRes = await request(app).post('/api/customer-orders').set('Authorization', `Bearer ${salesToken}`).send({
      customerName: 'Test Customer', location: 'Warehouse Test', item: 'Test Item', quantity: 10
    });
    
    const cancelRes = await request(app).patch(`/api/customer-orders/${orderRes.body.data.id}/cancel`).set('Authorization', `Bearer ${salesToken}`);
    expect(cancelRes.status).toBe(200);

    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    expect(inv?.reservedQuantity).toBe(80);
  });
});
