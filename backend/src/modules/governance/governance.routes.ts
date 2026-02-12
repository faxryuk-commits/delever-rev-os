/**
 * Governance: audit log, current user permissions, roles.
 */
import { Router, type Request, type Response } from 'express';
import { query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import type { AuthLocals } from '../../shared/auth.js';
import { requireRole } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

/** Role → endpoint access matrix (used for /me/permissions) */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  sales: [
    'leads:read', 'leads:write',
    'deals:read', 'deals:write',
    'companies:read', 'companies:write',
    'contacts:read', 'contacts:write',
    'tasks:read', 'tasks:write',
    'commissions:read_own',
  ],
  partner: [
    'leads:read_own', 'leads:write_own',
    'deals:read_own',
    'commissions:read_own',
  ],
  cs: [
    'companies:read', 'companies:write',
    'contracts:read',
    'subscriptions:read',
    'onboarding:read', 'onboarding:write',
    'health_scores:read', 'health_scores:write',
  ],
  finance: [
    'invoices:read', 'invoices:write',
    'payments:read', 'payments:write',
    'commissions:read', 'commissions:write',
    'contracts:read',
  ],
};

/* ---- GET /me ---- */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const auth = res.locals.auth as AuthLocals;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { role: true, territory: true, salesRep: true },
  });
  res.json(user);
});

/* ---- GET /me/permissions ---- */
router.get('/me/permissions', async (req: Request, res: Response): Promise<void> => {
  const auth = res.locals.auth as AuthLocals;
  const permissions = ROLE_PERMISSIONS[auth.roleCode] || [];
  res.json({ roleCode: auth.roleCode, permissions });
});

/* ---- GET /audit-log ---- */
router.get(
  '/audit-log',
  requireRole('admin'),
  [
    query('entity_type').optional().isString(),
    query('entity_id').optional().isUUID(),
    query('user_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const where: Record<string, unknown> = {};
    if (req.query.entity_type) where.entityType = req.query.entity_type;
    if (req.query.entity_id) where.entityId = req.query.entity_id;
    if (req.query.user_id) where.userId = req.query.user_id;

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

export default router;
