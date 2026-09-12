import { Request, Response } from 'express';
import prisma from '../database/prisma';
import { CustomerOrderStatus } from '@prisma/client';

const formatCustomerOrder = (order: any) => ({
  id: order.id,
  customerName: order.customerName,
  location: order.location.name,
  item: order.item.name,
  quantity: order.quantity,
  status: order.status,
  createdBy: order.createdBy.name,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt
});

export const createCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, location, item, quantity } = req.body;
    const userId = req.user!.userId;

    if (!customerName || !location || !item) {
      res.status(400).json({ success: false, message: 'customerName, location, and item are required.' });
      return;
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be > 0.' });
      return;
    }

    const locationRecord = await prisma.location.findFirst({ where: { name: location } });
    const itemRecord = await prisma.item.findFirst({ where: { name: item } });

    if (!locationRecord || !itemRecord) {
      res.status(404).json({ success: false, message: 'Location or item not found.' });
      return;
    }

    const inventory = await prisma.inventory.findFirst({
      where: { itemId: itemRecord.id, locationId: locationRecord.id }
    });

    if (!inventory) {
      res.status(400).json({ success: false, message: 'Insufficient available inventory' });
      return;
    }

    const availableQuantity = inventory.physicalQuantity - inventory.reservedQuantity;
    if (quantity > availableQuantity) {
      res.status(400).json({ success: false, message: 'Insufficient available inventory' });
      return;
    }

    // Atomic stock reservation
    const result = await prisma.$executeRaw`
      UPDATE "Inventory"
      SET "reservedQuantity" = "reservedQuantity" + ${quantity},
          "updatedAt" = NOW()
      WHERE "id" = ${inventory.id}
        AND ("physicalQuantity" - "reservedQuantity") >= ${quantity}
    `;

    // $executeRaw returns the number of rows affected
    if (result === 0) {
      res.status(409).json({ success: false, message: 'Insufficient available inventory due to concurrent reservation.' });
      return;
    }

    const order = await prisma.customerOrder.create({
      data: {
        customerName,
        locationId: locationRecord.id,
        itemId: itemRecord.id,
        quantity,
        status: CustomerOrderStatus.RESERVED,
        createdById: userId
      },
      include: { location: true, item: true, createdBy: true }
    });

    res.status(201).json({ success: true, data: formatCustomerOrder(order) });
  } catch (error) {
    console.error('Create customer order error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as CustomerOrderStatus;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const total = await prisma.customerOrder.count({ where });
    const records = await prisma.customerOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { location: true, item: true, createdBy: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: records.map(formatCustomerOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: { location: true, item: true, createdBy: true }
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Customer order not found' });
      return;
    }

    res.status(200).json({ success: true, data: formatCustomerOrder(order) });
  } catch (error) {
    console.error('Get customer order error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const cancelCustomerOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const role = req.user!.role;
    
    const order = await prisma.customerOrder.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Customer order not found' });
      return;
    }

    if (role === 'SALES' && order.createdById !== userId) {
      res.status(403).json({ success: false, message: 'Cannot cancel an order you did not create' });
      return;
    }

    if (order.status === CustomerOrderStatus.CANCELLED) {
      res.status(400).json({ success: false, message: 'Order is already cancelled' });
      return;
    }

    if (order.status !== CustomerOrderStatus.RESERVED) {
      res.status(400).json({ success: false, message: 'Only reserved orders can be cancelled' });
      return;
    }

    await prisma.$transaction(async (prismaClient) => {
      const inventory = await prismaClient.inventory.findFirst({
        where: { itemId: order.itemId, locationId: order.locationId }
      });

      if (inventory) {
        await prismaClient.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: { decrement: order.quantity }
          }
        });
      }

      await prismaClient.customerOrder.update({
        where: { id },
        data: { status: CustomerOrderStatus.CANCELLED }
      });
    });

    const updated = await prisma.customerOrder.findUnique({
      where: { id },
      include: { location: true, item: true, createdBy: true }
    });

    res.status(200).json({ success: true, data: formatCustomerOrder(updated) });
  } catch (error) {
    console.error('Cancel customer order error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
