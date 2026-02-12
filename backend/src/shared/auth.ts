import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { unauthorized, forbidden } from './errors.js';

const prisma = new PrismaClient();

export interface JwtPayload {
  userId: string;
  email: string;
  roleCode: string;
}

export interface AuthLocals {
  userId: string;
  email: string;
  roleCode: string;
  territoryId: string | null;
  partnerId: string | null;
  salesRepId: string | null;
}

declare global {
  namespace Express {
    interface Response {
      locals: Record<string, unknown> & { auth?: AuthLocals };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  return decoded;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(unauthorized('Missing or invalid Authorization header'));
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true, salesRep: true, territory: true },
    });
    if (!user) {
      next(unauthorized('User not found'));
      return;
    }
    res.locals.auth = {
      userId: user.id,
      email: user.email,
      roleCode: user.role?.code ?? 'sales',
      territoryId: user.territoryId,
      partnerId: user.partnerId,
      salesRepId: user.salesRep?.id ?? null,
    };
    next();
  } catch {
    next(unauthorized('Invalid token'));
  }
}

export function requireRole(...allowed: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = res.locals.auth as AuthLocals | undefined;
    if (!auth) {
      next(unauthorized());
      return;
    }
    if (!allowed.includes(auth.roleCode)) {
      next(forbidden('Insufficient role'));
      return;
    }
    next();
  };
}

export function requireSalesRep(req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined;
  if (!auth) {
    next(unauthorized());
    return;
  }
  if (auth.roleCode !== 'admin' && !auth.salesRepId) {
    next(forbidden('Sales rep profile required'));
    return;
  }
  next();
}
