/**
 * Data scope by role: partner sees only own leads/deals; sales sees by territory/assigned; admin sees all.
 */

import type { Prisma } from '@prisma/client';
import type { AuthLocals } from './auth.js';

export function leadScope(auth: AuthLocals): Prisma.LeadWhereInput {
  if (auth.roleCode === 'admin') return {};
  if (auth.partnerId) return { partnerId: auth.partnerId };
  if (auth.salesRepId) return { assignedToId: auth.salesRepId };
  return { id: 'never' };
}

export function dealScope(auth: AuthLocals): Prisma.DealWhereInput {
  if (auth.roleCode === 'admin') return {};
  if (auth.partnerId) {
    return { lead: { partnerId: auth.partnerId } };
  }
  if (auth.salesRepId) return { salesRepId: auth.salesRepId };
  return { id: 'never' };
}

export function companyScope(auth: AuthLocals): Prisma.CompanyWhereInput {
  if (auth.roleCode === 'admin') return {};
  if (auth.territoryId) return { territoryId: auth.territoryId };
  return {};
}
