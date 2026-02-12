import express from 'express';
import cors from 'cors';
import { authMiddleware } from './shared/auth.js';
import { AppError } from './shared/errors.js';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import leadRoutes from './modules/leads/lead.routes.js';
import dealRoutes from './modules/deals/deal.routes.js';
import companyRoutes from './modules/companies/company.routes.js';
import contactRoutes from './modules/contacts/contact.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import contractRoutes from './modules/contracts/contract.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscription.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import commissionRoutes from './modules/commissions/commission.routes.js';
import csRoutes from './modules/customer-success/cs.routes.js';
import automationRoutes, { internalJobsRouter } from './modules/automation/automation.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import governanceRoutes from './modules/governance/governance.routes.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/* Health check */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* Auth (no auth middleware) */
app.use('/api/v1/auth', authRoutes);

/* Webhooks (no auth middleware — external capture) */
app.use('/api/v1/webhooks', webhookRoutes);

/* Internal jobs (protected by X-Internal-Secret, no JWT) */
app.use('/api/v1/internal/jobs', internalJobsRouter);

/* Authenticated API */
const api = express.Router();
api.use(authMiddleware);

// Core CRM
api.use('/leads', leadRoutes);
api.use('/deals', dealRoutes);
api.use('/companies', companyRoutes);
api.use('/contacts', contactRoutes);
api.use('/tasks', taskRoutes);

// Revenue & Billing
api.use('/contracts', contractRoutes);
api.use('/subscriptions', subscriptionRoutes);
api.use('/invoices', invoiceRoutes);

// Analytics & AI
api.use('/analytics', analyticsRoutes);
api.use('/ai', aiRoutes);

// AI routes nested under leads/deals for convenience
api.get('/leads/:id/score', (req, res, next) => {
  // Proxy to AI router
  req.url = `/leads/${req.params.id}/score`;
  aiRoutes(req, res, next);
});
api.get('/deals/:id/risk', (req, res, next) => {
  req.url = `/deals/${req.params.id}/risk`;
  aiRoutes(req, res, next);
});

// Commissions
api.use('/commissions', commissionRoutes);

// Customer Success (nested under companies)
api.use('/companies/:companyId', csRoutes);

// Automation
api.use('/', automationRoutes);

// Settings
api.use('/settings', settingsRoutes);

// Governance
api.use('/', governanceRoutes);

app.use('/api/v1', api);

/* Global error handler */
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJson());
    return;
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`Delever Revenue OS API listening on ${PORT}`));
