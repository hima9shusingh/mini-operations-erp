import request from 'supertest';
import app from '../index';
import prisma from '../database/prisma';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

let adminToken = '';
let salesToken = '';
let sourceLocId = '';
let destLocId = '';
let itemId = '';
let transferId = '';
let inventoryId = '';

beforeAll(async () => {
  const pass = await bcrypt.hash('password', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin-tr@test.com', passwordHash: pass, role: 'ADMIN' } });
  adminToken = generateToken(admin.id, admin.role);

  const sales = await prisma.user.create({ data: { name: 'Sales', email: 'sales-tr@test.com', passwordHash: pass, role: 'SALES' } });
  salesToken = generateToken(sales.id, sales.role);

  const src = await prisma.location.create({ data: { name: 'Source', code: 'SRC' } });
  sourceLocId = src.id;

  const dest = await prisma.location.create({ data: { name: 'Destination', code: 'DST' } });
  destLocId = dest.id;

  const item = await prisma.item.create({ data: { name: 'Transfer Item', sku: 'TI-TR', category: 'Parts' } });
  itemId = item.id;
});

beforeEach(async () => {
  await prisma.internalTransfer.deleteMany();
  await prisma.inventory.deleteMany();

  const inv = await prisma.inventory.create({
    data: { locationId: sourceLocId, itemId, batch: 'B1', physicalQuantity: 100, reservedQuantity: 70 }
  });
  inventoryId = inv.id;

  const tr = await prisma.internalTransfer.create({
    data: { sourceLocationId: sourceLocId, destinationLocationId: destLocId, itemId, quantity: 40, status: 'REQUESTED' }
  });
  transferId = tr.id;
});

describe('Transfer Tests', () => {
  it('Cannot transfer more than available inventory (returns 400)', async () => {
    const res = await request(app)
      .patch(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    const tr = await prisma.internalTransfer.findUnique({ where: { id: transferId } });
    expect(tr?.status).toBe('REQUESTED');
  });

  it('Destination stock increases only after transfer receipt', async () => {
    await prisma.internalTransfer.update({ where: { id: transferId }, data: { quantity: 20 } });
    
    await request(app).patch(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
    const destInvBeforeReceive = await prisma.inventory.findFirst({ where: { locationId: destLocId, itemId } });
    expect(destInvBeforeReceive).toBeNull();

    await request(app).patch(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${adminToken}`);
    const destInvAfterReceive = await prisma.inventory.findFirst({ where: { locationId: destLocId, itemId } });
    expect(destInvAfterReceive?.physicalQuantity).toBe(20);
  });

  it('Same transfer cannot be received twice', async () => {
    await prisma.internalTransfer.update({ where: { id: transferId }, data: { quantity: 20 } });
    await request(app).patch(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${adminToken}`);
    
    const res1 = await request(app).patch(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(200);

    const res2 = await request(app).patch(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(400);
  });

  it('SALES cannot dispatch or receive', async () => {
    await prisma.internalTransfer.update({ where: { id: transferId }, data: { quantity: 20 } });
    
    const resDispatch = await request(app).patch(`/api/transfers/${transferId}/dispatch`).set('Authorization', `Bearer ${salesToken}`);
    expect(resDispatch.status).toBe(403);

    await prisma.internalTransfer.update({ where: { id: transferId }, data: { status: 'DISPATCHED' } });
    
    const resReceive = await request(app).patch(`/api/transfers/${transferId}/receive`).set('Authorization', `Bearer ${salesToken}`);
    expect(resReceive.status).toBe(403);
  });
});
