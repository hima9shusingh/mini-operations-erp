import { Request, Response } from 'express';
import prisma from '../database/prisma';
import { WorkOrderStatus } from '@prisma/client';

const formatWorkOrder = (wo: any) => ({
  id: wo.id,
  location: wo.location.name,
  item: wo.item.name,
  requiredQuantity: wo.requiredQuantity,
  status: wo.status,
  assignedUser: wo.assignedUser,
  createdAt: wo.createdAt,
  updatedAt: wo.updatedAt
});

export const createWorkOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, item, requiredQuantity, assignedUserId } = req.body;

    if (!location || !item || !assignedUserId) {
      res.status(400).json({ success: false, message: 'location, item, and assignedUserId are required.' });
      return;
    }

    if (typeof requiredQuantity !== 'number' || requiredQuantity <= 0) {
      res.status(400).json({ success: false, message: 'requiredQuantity must be > 0.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: assignedUserId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OPERATIONS')) {
      res.status(404).json({ success: false, message: 'Assigned user not found or cannot be assigned work.' });
      return;
    }

    const locationRecord = await prisma.location.findFirst({ where: { name: location } });
    const itemRecord = await prisma.item.findFirst({ where: { name: item } });

    if (!locationRecord || !itemRecord) {
      res.status(404).json({ success: false, message: 'Location or item not found.' });
      return;
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        locationId: locationRecord.id,
        itemId: itemRecord.id,
        requiredQuantity,
        assignedUserId,
        status: WorkOrderStatus.ASSIGNED
      },
      include: {
        location: true,
        item: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.status(201).json({
      success: true,
      data: formatWorkOrder(workOrder)
    });
  } catch (error) {
    console.error('Create WO error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getWorkOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as WorkOrderStatus;
    const location = req.query.location as string;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (location) {
      where.location = { name: { equals: location, mode: 'insensitive' } };
    }

    const total = await prisma.workOrder.count({ where });
    const records = await prisma.workOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        location: true,
        item: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: records.map(formatWorkOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get WOs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getWorkOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        item: true,
        location: true,
        assignedUser: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    if (!workOrder) {
      res.status(404).json({ success: false, message: 'Work Order not found' });
      return;
    }

    const inventories = await prisma.inventory.findMany({
      where: {
        itemId: workOrder.itemId,
        locationId: workOrder.locationId
      }
    });

    let availableQuantity = 0;
    for (const inv of inventories) {
      availableQuantity += (inv.physicalQuantity - inv.reservedQuantity);
    }
    
    if (availableQuantity < 0) availableQuantity = 0;

    let shortageQuantity = workOrder.requiredQuantity - availableQuantity;
    if (shortageQuantity < 0) shortageQuantity = 0;

    res.status(200).json({
      success: true,
      data: {
        id: workOrder.id,
        location: workOrder.location.name,
        item: workOrder.item.name,
        requiredQuantity: workOrder.requiredQuantity,
        status: workOrder.status,
        assignedUser: workOrder.assignedUser,
        materialAvailability: {
          availableQuantity,
          shortageQuantity
        },
        createdAt: workOrder.createdAt,
        updatedAt: workOrder.updatedAt
      }
    });
  } catch (error) {
    console.error('Get WO by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateWorkOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !Object.values(WorkOrderStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const workOrder = await prisma.workOrder.findUnique({ where: { id } });
    if (!workOrder) {
      res.status(404).json({ success: false, message: 'Work Order not found' });
      return;
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { status },
      include: {
        location: true,
        item: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.status(200).json({ success: true, data: formatWorkOrder(updated) });
  } catch (error) {
    console.error('Update WO status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
