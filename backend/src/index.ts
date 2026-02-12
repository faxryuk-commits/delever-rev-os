import express from 'express';
import cors from 'cors';
import { authMiddleware } from './shared/auth.js';
import { AppError } from './shared/errors.js';
import authRoutes from './modules/auth/auth.routes.js';
import leadRoutes from './modules/leads/lead.routes.js';
import dealRoutes from './modules/deals/deal.routes.js';
import companyRoutes from './modules/companies/company.routes.js';
import contactRoutes from './modules/contacts/contact.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRoutes);

const api = express.Router();
api.use(authMiddleware);
api.use('/leads', leadRoutes);
api.use('/deals', dealRoutes);
api.use('/companies', companyRoutes);
api.use('/contacts', contactRoutes);
api.use('/settings', settingsRoutes);
api.use('/tasks', taskRoutes);

api.get('/me', async (req, res) => {
  const auth = res.locals.auth;
  res.json({ userId: auth.userId, email: auth.email, roleCode: auth.roleCode });
});

app.use('/api/v1', api);

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
