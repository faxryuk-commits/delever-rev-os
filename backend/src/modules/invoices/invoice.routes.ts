import { Router, type Request, type Response, type NextFunction } from 'express';
import { query, body, param } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { notFound, validationError } from '../../shared/errors.js';
import { emit } from '../../shared/events.js';
import type { AuthLocals } from '../../shared/auth.js';

const router = Router();
const prisma = new PrismaClient();

/* ---- List invoices ---- */
router.get(
  '/',
  [
    query('status').optional().isString(),
    query('contract_id').optional().isUUID(),
    query('subscription_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.contract_id) where.contractId = req.query.contract_id;
    if (req.query.subscription_id) where.subscriptionId = req.query.subscription_id;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { currency: true, subscription: true, contract: true, payments: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  }
);

/* ---- Get invoice by ID ---- */
router.get(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        currency: true,
        subscription: { include: { product: true } },
        contract: { include: { company: true } },
        payments: { include: { currency: true } },
      },
    });
    if (!inv) { next(notFound('Invoice not found')); return; }
    res.json(inv);
  }
);

/* ---- Create invoice ---- */
router.post(
  '/',
  body('amount').isDecimal(),
  body('currency_id').isUUID(),
  body('subscription_id').optional().isUUID(),
  body('contract_id').optional().isUUID(),
  body('due_date').optional().isISO8601(),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.body.subscription_id && !req.body.contract_id) {
      next(validationError('Either subscription_id or contract_id is required'));
      return;
    }
    const inv = await prisma.invoice.create({
      data: {
        subscriptionId: req.body.subscription_id,
        contractId: req.body.contract_id,
        amount: Number(req.body.amount),
        currencyId: req.body.currency_id,
        status: req.body.status || 'draft',
        dueDate: req.body.due_date ? new Date(req.body.due_date) : undefined,
      },
      include: { currency: true, subscription: true, contract: true },
    });
    emit({
      type: 'InvoiceIssued',
      at: new Date().toISOString(),
      invoiceId: inv.id,
      amount: Number(inv.amount),
    });
    res.status(201).json(inv);
  }
);

/* ---- Update invoice ---- */
router.patch(
  '/:id',
  param('id').isUUID(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) { next(notFound('Invoice not found')); return; }
    const data: Record<string, unknown> = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.due_date !== undefined) data.dueDate = req.body.due_date ? new Date(req.body.due_date) : null;
    if (req.body.amount !== undefined) data.amount = Number(req.body.amount);
    const inv = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
      include: { currency: true, subscription: true, contract: true },
    });
    res.json(inv);
  }
);

/* ---- Register payment for invoice ---- */
router.post(
  '/:id/payments',
  param('id').isUUID(),
  body('amount').isDecimal(),
  body('currency_id').isUUID(),
  body('paid_at').isISO8601(),
  body('method').optional().isString(),
  body('gateway_fee').optional().isDecimal(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = res.locals.auth as AuthLocals;
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) { next(notFound('Invoice not found')); return; }
    const payment = await prisma.payment.create({
      data: {
        invoiceId: req.params.id,
        amount: Number(req.body.amount),
        currencyId: req.body.currency_id,
        paidAt: new Date(req.body.paid_at),
        method: req.body.method,
        gatewayFee: req.body.gateway_fee ? Number(req.body.gateway_fee) : undefined,
      },
      include: { currency: true },
    });
    // Mark invoice as paid if total payments >= amount
    const totalPaid = await prisma.payment.aggregate({
      where: { invoiceId: req.params.id },
      _sum: { amount: true },
    });
    if (totalPaid._sum.amount && Number(totalPaid._sum.amount) >= Number(invoice.amount)) {
      await prisma.invoice.update({
        where: { id: req.params.id },
        data: { status: 'paid', paidAt: new Date() },
      });
    }
    emit({
      type: 'PaymentReceived',
      at: new Date().toISOString(),
      userId: auth.userId,
      paymentId: payment.id,
      invoiceId: req.params.id,
      amount: Number(req.body.amount),
    });
    res.status(201).json(payment);
  }
);

export default router;
