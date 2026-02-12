import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { signToken } from '../../shared/auth.js';
import { validationError } from '../../shared/errors.js';

const router = Router();
const prisma = new PrismaClient();

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(validationError('Validation failed', errors.array().map((e: { path?: string; msg?: string }) => ({ field: e.path ?? 'body', message: e.msg ?? 'Invalid' }))));
      return;
    }
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      next(validationError('Invalid email or password'));
      return;
    }
    const token = signToken({
      userId: user.id,
      email: user.email,
      roleCode: user.role?.code ?? 'sales',
    });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, roleCode: user.role?.code } });
  }
);

export default router;
