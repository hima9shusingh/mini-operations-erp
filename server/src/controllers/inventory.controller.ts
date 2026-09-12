import { Request, Response } from 'express';
import prisma from '../database/prisma';

// Helper to map DB model to flat API response structure
const formatInventory = (inv: any) => ({
  id: inv.id,
  item: inv.item.name,
  category: inv.item.category,
  location: inv.location.name,
  batch: inv.batch,
  physicalQuantity: inv.physicalQuantity,
  reservedQuantity: inv.reservedQuantity,
  availableQuantity: inv.physicalQuantity - inv.reservedQuantity,
  createdAt: inv.createdAt,
  updatedAt: inv.updatedAt
});

export const createInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { item, category, location, batch, physicalQuantity, reservedQuantity } = req.body;

    if (!item || !category || !location || !batch) {
      res.status(400).json({ success: false, message: 'Item, category, location, and batch are required.' });
      return;
    }

    if (typeof physicalQuantity !== 'number' || physicalQuantity < 0) {
      res.status(400).json({ success: false, message: 'physicalQuantity must be a number >= 0.' });
      return;
    }

    const resQty = reservedQuantity !== undefined ? reservedQuantity : 0;
    if (typeof resQty !== 'number' || resQty < 0) {
      res.status(400).json({ success: false, message: 'reservedQuantity must be a number >= 0.' });
      return;
    }

    if (resQty > physicalQuantity) {
      res.status(400).json({ success: false, message: 'reservedQuantity cannot be greater than physicalQuantity.' });
      return;
    }

    // Resolve or create Item
    let itemRecord = await prisma.item.findFirst({ where: { name: item } });
    if (!itemRecord) {
      const sku = `${item.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
      itemRecord = await prisma.item.create({
        data: { name: item, category, sku }
      });
    }

    // Resolve or create Location
    let locationRecord = await prisma.location.findFirst({ where: { name: location } });
    if (!locationRecord) {
      const code = `${location.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
      locationRecord = await prisma.location.create({
        data: { name: location, code }
      });
    }

    // Check for duplicates
    const duplicate = await prisma.inventory.findFirst({
      where: {
        itemId: itemRecord.id,
        locationId: locationRecord.id,
        batch
      }
    });

    if (duplicate) {
      res.status(409).json({ success: false, message: 'Duplicate inventory record for this item, location, and batch.' });
      return;
    }

    const inventory = await prisma.inventory.create({
      data: {
        itemId: itemRecord.id,
        locationId: locationRecord.id,
        batch,
        physicalQuantity,
        reservedQuantity: resQty
      },
      include: { item: true, location: true }
    });

    res.status(201).json({
      success: true,
      data: formatInventory(inventory)
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInventoryList = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const locationFilter = req.query.location as string;
    const categoryFilter = req.query.category as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { item: { name: { contains: search, mode: 'insensitive' } } },
        { item: { category: { contains: search, mode: 'insensitive' } } },
        { location: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (locationFilter) {
      where.location = { ...where.location, name: { equals: locationFilter, mode: 'insensitive' } };
    }

    if (categoryFilter) {
      where.item = { ...where.item, category: { equals: categoryFilter, mode: 'insensitive' } };
    }

    const total = await prisma.inventory.count({ where });
    const records = await prisma.inventory.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { item: true, location: true }
    });

    res.status(200).json({
      success: true,
      data: records.map(formatInventory),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory list error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getInventoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const inv = await prisma.inventory.findUnique({
      where: { id },
      include: { item: true, location: true }
    });

    if (!inv) {
      res.status(404).json({ success: false, message: 'Inventory not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatInventory(inv)
    });
  } catch (error) {
    console.error('Get inventory by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { item, category, location, batch, physicalQuantity } = req.body;

    const existing: any = await prisma.inventory.findUnique({
      where: { id },
      include: { item: true, location: true }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Inventory not found' });
      return;
    }

    let updatedPhysical = existing.physicalQuantity;
    if (physicalQuantity !== undefined) {
      if (typeof physicalQuantity !== 'number' || physicalQuantity < 0) {
        res.status(400).json({ success: false, message: 'physicalQuantity must be a number >= 0.' });
        return;
      }
      if (physicalQuantity < existing.reservedQuantity) {
        res.status(400).json({ success: false, message: 'physicalQuantity cannot be less than reservedQuantity.' });
        return;
      }
      updatedPhysical = physicalQuantity;
    }

    let itemId = existing.itemId;
    let locationId = existing.locationId;
    let newBatch = batch || existing.batch;

    if (item || category) {
      const targetItem = item || existing.item.name;
      const targetCat = category || existing.item.category;
      let itemRecord = await prisma.item.findFirst({ where: { name: targetItem } });
      if (!itemRecord) {
        const sku = `${targetItem.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
        itemRecord = await prisma.item.create({ data: { name: targetItem, category: targetCat, sku } });
      }
      itemId = itemRecord.id;
    }

    if (location) {
      let locationRecord = await prisma.location.findFirst({ where: { name: location } });
      if (!locationRecord) {
        const code = `${location.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
        locationRecord = await prisma.location.create({ data: { name: location, code } });
      }
      locationId = locationRecord.id;
    }

    // Check duplicate if relationships or batch changed
    if (itemId !== existing.itemId || locationId !== existing.locationId || newBatch !== existing.batch) {
      const duplicate = await prisma.inventory.findFirst({
        where: { itemId, locationId, batch: newBatch, NOT: { id } }
      });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'Duplicate inventory record for this item, location, and batch.' });
        return;
      }
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        itemId,
        locationId,
        batch: newBatch,
        physicalQuantity: updatedPhysical
      },
      include: { item: true, location: true }
    });

    res.status(200).json({
      success: true,
      data: formatInventory(updated)
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Inventory not found' });
      return;
    }

    await prisma.inventory.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Inventory deleted successfully.' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
