import { Request, Response } from 'express';
import prisma from '../database/prisma';
import { TransferStatus } from '@prisma/client';

const formatTransfer = (transfer: any) => ({
  id: transfer.id,
  sourceLocation: transfer.sourceLocation.name,
  destinationLocation: transfer.destinationLocation.name,
  item: transfer.item.name,
  quantity: transfer.quantity,
  status: transfer.status,
  createdAt: transfer.createdAt,
  updatedAt: transfer.updatedAt
});

export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sourceLocation, destinationLocation, item, quantity } = req.body;

    if (!sourceLocation || !destinationLocation || !item) {
      res.status(400).json({ success: false, message: 'sourceLocation, destinationLocation, and item are required.' });
      return;
    }

    if (sourceLocation === destinationLocation) {
      res.status(400).json({ success: false, message: 'Source and destination locations must be different.' });
      return;
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be > 0.' });
      return;
    }

    let itemRecord = await prisma.item.findFirst({ where: { name: item } });
    if (!itemRecord) {
      const sku = `${item.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
      itemRecord = await prisma.item.create({ data: { name: item, category: 'Uncategorized', sku } });
    }

    let sourceRecord = await prisma.location.findFirst({ where: { name: sourceLocation } });
    if (!sourceRecord) {
      const code = `${sourceLocation.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
      sourceRecord = await prisma.location.create({ data: { name: sourceLocation, code } });
    }

    let destRecord = await prisma.location.findFirst({ where: { name: destinationLocation } });
    if (!destRecord) {
      const code = `${destinationLocation.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
      destRecord = await prisma.location.create({ data: { name: destinationLocation, code } });
    }

    const transfer = await prisma.internalTransfer.create({
      data: {
        sourceLocationId: sourceRecord.id,
        destinationLocationId: destRecord.id,
        itemId: itemRecord.id,
        quantity,
        status: TransferStatus.REQUESTED
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true
      }
    });

    res.status(201).json({
      success: true,
      data: formatTransfer(transfer)
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as TransferStatus;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const total = await prisma.internalTransfer.count({ where });
    const records = await prisma.internalTransfer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: records.map(formatTransfer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTransferById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true
      }
    });

    if (!transfer) {
      res.status(404).json({ success: false, message: 'Transfer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatTransfer(transfer)
    });
  } catch (error) {
    console.error('Get transfer by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const dispatchTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const transfer = await prisma.internalTransfer.findUnique({ where: { id } });
    if (!transfer) {
      res.status(404).json({ success: false, message: 'Transfer not found' });
      return;
    }

    if (transfer.status !== TransferStatus.REQUESTED) {
      res.status(400).json({ success: false, message: 'Transfer must be in REQUESTED state to dispatch.' });
      return;
    }

    // Sum available quantity across all batches for this item + location
    // Wait, the transfer doesn't specify a batch. Let's just deduct from the first available batch, or use the sum.
    // The instructions say: "Find inventory at sourceLocation for the item... If requested transfer quantity is greater than available quantity: reject the request... decrease source physicalQuantity by transfer quantity".
    // Since batches exist, we can just find any single batch that has enough, or a specific batch. But since API didn't ask for a batch in transfer, let's just use findFirst, assuming one batch or aggregated for simplicity.
    const inventories = await prisma.inventory.findMany({
      where: {
        itemId: transfer.itemId,
        locationId: transfer.sourceLocationId
      }
    });

    let targetInventory = null;
    let available = 0;

    for (const inv of inventories) {
      const invAvailable = inv.physicalQuantity - inv.reservedQuantity;
      if (invAvailable >= transfer.quantity) {
        targetInventory = inv;
        available = invAvailable;
        break;
      }
    }

    if (!targetInventory) {
      res.status(400).json({ success: false, message: 'Insufficient available inventory at source location' });
      return;
    }

    // Wrap in a transaction
    await prisma.$transaction(async (prismaClient) => {
      // Decrease source inventory
      await prismaClient.inventory.update({
        where: { id: targetInventory!.id },
        data: {
          physicalQuantity: { decrement: transfer.quantity }
        }
      });

      // Update transfer status
      await prismaClient.internalTransfer.update({
        where: { id },
        data: { status: TransferStatus.DISPATCHED }
      });
    });

    const updatedTransfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: { sourceLocation: true, destinationLocation: true, item: true }
    });

    res.status(200).json({ success: true, data: formatTransfer(updatedTransfer) });
  } catch (error) {
    console.error('Dispatch transfer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const receiveTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    const transfer = await prisma.internalTransfer.findUnique({ where: { id } });
    if (!transfer) {
      res.status(404).json({ success: false, message: 'Transfer not found' });
      return;
    }

    if (transfer.status !== TransferStatus.DISPATCHED) {
      res.status(400).json({ success: false, message: 'Transfer must be in DISPATCHED state to receive.' });
      return;
    }

    await prisma.$transaction(async (prismaClient) => {
      // Find destination inventory. Just pick the first one matching item and location, usually 'DEFAULT' batch for this simple case.
      const destInventory = await prismaClient.inventory.findFirst({
        where: {
          itemId: transfer.itemId,
          locationId: transfer.destinationLocationId
        }
      });

      if (destInventory) {
        await prismaClient.inventory.update({
          where: { id: destInventory.id },
          data: {
            physicalQuantity: { increment: transfer.quantity }
          }
        });
      } else {
        await prismaClient.inventory.create({
          data: {
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
            batch: 'DEFAULT',
            physicalQuantity: transfer.quantity,
            reservedQuantity: 0
          }
        });
      }

      // Update transfer status
      await prismaClient.internalTransfer.update({
        where: { id },
        data: { status: TransferStatus.RECEIVED }
      });
    });

    const updatedTransfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: { sourceLocation: true, destinationLocation: true, item: true }
    });

    res.status(200).json({ success: true, data: formatTransfer(updatedTransfer) });
  } catch (error) {
    console.error('Receive transfer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
