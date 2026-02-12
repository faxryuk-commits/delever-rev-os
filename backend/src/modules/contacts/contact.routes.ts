import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound } from '../../shared/errors.js';
import { companyScope } from '../../shared/scope.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { company: true },
    });
    if (!contact) {
      next(notFound('Contact not found'));
      return;
    }
    const scope = companyScope(auth);
    const company = await prisma.company.findFirst({ where: { id: contact.companyId ?? '', ...scope } });
    if (contact.companyId && !company) {
      next(notFound('Contact not found'));
      return;
    }
    res.json(contact);
  }
);

router.patch(
  '/:id',
  param('id').isUUID(),
  body('name').optional().isString(),
  body('email').optional().isString(),
  body('phone').optional().isString(),
  body('position').optional().isString(),
  body('company_id').optional().isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      next(notFound('Contact not found'));
      return;
    }
    if (existing.companyId) {
      const scope = companyScope(auth);
      const company = await prisma.company.findFirst({ where: { id: existing.companyId, ...scope } });
      if (!company) {
        next(notFound('Contact not found'));
        return;
      }
    }
    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.email !== undefined) data.email = req.body.email;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.body.position !== undefined) data.position = req.body.position;
    if (req.body.company_id !== undefined) data.companyId = req.body.company_id;
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data,
      include: { company: true },
    });
    res.json(contact);
  }
);

export default router;
