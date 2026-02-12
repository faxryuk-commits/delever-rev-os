import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';
import { companyScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const where = { ...companyScope(auth), deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: { territory: true },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.company.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = companyScope(auth);
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, deletedAt: null, ...scope },
      include: { territory: true },
    });
    if (!company) {
      next(notFound('Company not found'));
      return;
    }
    res.json(company);
  }
);

router.post(
  '/',
  body('name').isString().notEmpty(),
  body('territory_id').optional().isUUID(),
  body('domain').optional().isString(),
  async (req: Request, res: Response): Promise<void> => {
    const company = await prisma.company.create({
      data: {
        name: req.body.name,
        territoryId: req.body.territory_id,
        domain: req.body.domain,
      },
      include: { territory: true },
    });
    res.status(201).json(company);
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('name').optional().isString().notEmpty(),
  body('territory_id').optional().isUUID(),
  body('domain').optional().isString(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = companyScope(auth);
    const existing = await prisma.company.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!existing) {
      next(notFound('Company not found'));
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.territory_id !== undefined) data.territoryId = req.body.territory_id;
    if (req.body.domain !== undefined) data.domain = req.body.domain;
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data,
      include: { territory: true },
    });
    res.json(company);
  }
);

router.get(
  '/:id/contacts',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = companyScope(auth);
    const company = await prisma.company.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!company) {
      next(notFound('Company not found'));
      return;
    }
    const contacts = await prisma.contact.findMany({
      where: { companyId: req.params.id },
    });
    res.json({ items: contacts });
  }
);

router.post(
  '/:id/contacts',
  param('id').isUUID(),
  body('name').isString().notEmpty(),
  body('email').optional().isString(),
  body('phone').optional().isString(),
  body('position').optional().isString(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const scope = companyScope(auth);
    const company = await prisma.company.findFirst({ where: { id: req.params.id, deletedAt: null, ...scope } });
    if (!company) {
      next(notFound('Company not found'));
      return;
    }
    const contact = await prisma.contact.create({
      data: {
        companyId: req.params.id,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        position: req.body.position,
      },
    });
    res.status(201).json(contact);
  }
);

export default router;