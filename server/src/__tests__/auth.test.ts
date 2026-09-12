import request from 'supertest';
import app from '../index';
import prisma from '../database/prisma';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';

let adminToken = '';

beforeAll(async () => {
  const pass = await bcrypt.hash('password', 10);
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin-auth@test.com', passwordHash: pass, role: 'ADMIN' }
  });
  adminToken = generateToken(admin.id, admin.role);
});

describe('Authentication Tests', () => {
  it('Login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin-auth@test.com',
      password: 'password'
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('Login with invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin-auth@test.com',
      password: 'wrongpassword'
    });
    expect(res.status).toBe(401);
  });

  it('Protected route without JWT returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
