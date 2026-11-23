import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type Ctx = QueryCtx | MutationCtx;
export type RespiraRole = 'familia' | 'medico' | 'hospital';

/** Máximo de vínculos lidos por conta (um médico com mais pacientes que isso precisa de paginação). */
export const MAX_LINKS = 500;

export async function getRespiraProfile(ctx: Ctx, userId: Id<'users'>) {
  return ctx.db
    .query('respiraProfiles')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
}

/** Quem não escolheu um tipo de conta é tratado como família. */
export async function getRespiraRole(ctx: Ctx, userId: Id<'users'>): Promise<RespiraRole> {
  return (await getRespiraProfile(ctx, userId))?.role ?? 'familia';
}

export async function findLink(ctx: Ctx, familyId: Id<'users'>, doctorId: Id<'users'>) {
  return ctx.db
    .query('respiraLinks')
    .withIndex('by_family_and_doctor', (q) => q.eq('familyId', familyId).eq('doctorId', doctorId))
    .first();
}

/** O médico está vinculado a esta família? `familyId` vem do caminho do dado, então pode ser inválido. */
export async function isLinkedDoctor(ctx: Ctx, doctorId: Id<'users'>, familyId: string) {
  const fid = ctx.db.normalizeId('users', familyId);
  if (!fid) return false;
  return (await findLink(ctx, fid, doctorId)) !== null;
}

export async function linkedFamilyIds(ctx: Ctx, doctorId: Id<'users'>) {
  const links = await ctx.db
    .query('respiraLinks')
    .withIndex('by_doctor', (q) => q.eq('doctorId', doctorId))
    .take(MAX_LINKS);
  return links.map((l) => l.familyId);
}

export async function displayName(ctx: Ctx, userId: Id<'users'>) {
  const profile = await getRespiraProfile(ctx, userId);
  if (profile?.nome) return profile.nome;
  const user = await ctx.db.get(userId);
  return user?.name ?? user?.email ?? 'Conta sem nome';
}
