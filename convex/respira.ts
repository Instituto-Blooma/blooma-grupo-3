import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { isPlatformAdmin, resolveActingUserId } from './lib/auth';
import {
  displayName,
  getRespiraRole,
  isLinkedDoctor,
  linkedFamilyIds,
  type RespiraRole,
} from './lib/respira';

/**
 * Banco do RespiraKids.
 *
 * O app guarda documentos por caminho ("coleção/documento/coleção/documento"), como no banco
 * do artefato original. Regras de acesso:
 *  - familias/<eu>/...        a própria família lê e escreve
 *  - familias/<f>/...         o médico vinculado à família <f> lê (todo o histórico)
 *  - retornos/<f>             a família lê; o médico vinculado escreve (devolutivas)
 *  - validacoes/<f>~<reg>     o médico vinculado lê e escreve
 *  - listas do topo           o médico vê só as famílias vinculadas a ele
 *  - admins da plataforma (equipe do projeto) leem e escrevem tudo
 */

const MAX_LIST = 1000;
const SEGMENT = /^[A-Za-z0-9_\-.~:@+]{1,180}$/;
const FAMILY_COLLECTIONS = new Set(['familias', 'retornos', 'validacoes']);

type Ctx = QueryCtx | MutationCtx;
type Viewer = {
  userId: Id<'users'>;
  admin: () => Promise<boolean>;
  role: () => Promise<RespiraRole>;
  /** Médico vinculado a esta família (ou a própria família). */
  cares: (familyId: string | null) => Promise<boolean>;
};

function deny(): never {
  throw new ConvexError({ code: 'invalid_argument', message: 'Sem permissão para este dado.' });
}

async function viewer(ctx: Ctx): Promise<Viewer> {
  const userId = await resolveActingUserId(ctx);
  if (!userId) {
    throw new ConvexError({ code: 'unauthenticated', message: 'Entre na sua conta.' });
  }
  let admin: boolean | null = null;
  let role: RespiraRole | null = null;
  const links = new Map<string, boolean>();
  const self: Viewer = {
    userId,
    admin: async () => (admin ??= await isPlatformAdmin(ctx, userId)),
    role: async () => (role ??= await getRespiraRole(ctx, userId)),
    cares: async (familyId) => {
      if (!familyId) return false;
      if (familyId === userId) return true;
      if ((await self.role()) !== 'medico') return false;
      if (!links.has(familyId)) links.set(familyId, await isLinkedDoctor(ctx, userId, familyId));
      return links.get(familyId)!;
    },
  };
  return self;
}

function segments(path: string, kind: 'doc' | 'collection'): string[] {
  const segs = path.split('/');
  const evenOk = kind === 'doc' ? segs.length % 2 === 0 : segs.length % 2 === 1;
  if (!evenOk || segs.length > 6 || !segs.every((s) => SEGMENT.test(s))) {
    throw new ConvexError({ code: 'invalid_argument', message: `Caminho inválido: ${path}` });
  }
  return segs;
}

/** Família dona do documento, pelo caminho. */
function familyOf(segs: string[]): string | null {
  if (segs.length < 2) return null;
  if (segs[0] === 'familias' || segs[0] === 'retornos') return segs[1];
  if (segs[0] === 'validacoes') return segs[1].split('~')[0] || null;
  return null;
}

async function canReadDoc(me: Viewer, segs: string[]) {
  return (await me.cares(familyOf(segs))) || (await me.admin());
}

async function canWriteDoc(me: Viewer, segs: string[]) {
  const family = familyOf(segs);
  if (segs[0] === 'familias' && family === me.userId) return true;
  // Devolutivas e validações: escritas pelo médico vinculado à família.
  if ((segs[0] === 'retornos' || segs[0] === 'validacoes') && family !== me.userId) {
    if (await me.cares(family)) return true;
  }
  return me.admin();
}

async function findDoc(ctx: Ctx, path: string) {
  return ctx.db
    .query('respiraDocs')
    .withIndex('by_path', (q) => q.eq('path', path))
    .unique();
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await resolveActingUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return {
      id: userId as string,
      admin: await isPlatformAdmin(ctx, userId),
      role: await getRespiraRole(ctx, userId),
      name: user?.name ?? user?.email ?? null,
    };
  },
});

export const getDoc = query({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const me = await viewer(ctx);
    const segs = segments(path, 'doc');
    if (!(await canReadDoc(me, segs))) deny();
    const doc = await findDoc(ctx, path);
    return doc ? { exists: true, data: doc.data } : { exists: false, data: null };
  },
});

export const listCollection = query({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const me = await viewer(ctx);
    const segs = segments(path, 'collection');
    const toRows = (docs: { path: string; data: unknown }[]) =>
      docs.map((d) => ({ id: d.path.slice(path.length + 1), data: d.data }));

    // Subcoleção (ex.: familias/<f>/registros): segue a permissão do documento pai.
    if (segs.length > 1) {
      if (!(await canReadDoc(me, segs.slice(0, -1)))) deny();
      const docs = await ctx.db
        .query('respiraDocs')
        .withIndex('by_collection', (q) => q.eq('collection', path))
        .take(MAX_LIST);
      return toRows(docs);
    }

    // Lista do topo: a equipe do projeto vê tudo.
    if (await me.admin()) {
      const docs = await ctx.db
        .query('respiraDocs')
        .withIndex('by_collection', (q) => q.eq('collection', path))
        .take(MAX_LIST);
      return toRows(docs);
    }

    // Médico: só as famílias vinculadas a ele.
    if (FAMILY_COLLECTIONS.has(path) && (await me.role()) === 'medico') {
      const rows: { path: string; data: unknown }[] = [];
      for (const familyId of await linkedFamilyIds(ctx, me.userId)) {
        const docs = await ctx.db
          .query('respiraDocs')
          .withIndex('by_collection_and_family', (q) =>
            q.eq('collection', path).eq('family', familyId)
          )
          .take(MAX_LIST);
        rows.push(...docs);
      }
      return toRows(rows);
    }

    deny();
  },
});

export const setDoc = mutation({
  args: { path: v.string(), data: v.any() },
  handler: async (ctx, { path, data }) => {
    const me = await viewer(ctx);
    const segs = segments(path, 'doc');
    if (!(await canWriteDoc(me, segs))) deny();
    const existing = await findDoc(ctx, path);
    const fields = {
      data,
      family: familyOf(segs) ?? undefined,
      updatedAt: Date.now(),
      updatedBy: me.userId,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('respiraDocs', {
        path,
        collection: segs.slice(0, -1).join('/'),
        ...fields,
      });
    }
    return null;
  },
});

export const deleteDoc = mutation({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const me = await viewer(ctx);
    const segs = segments(path, 'doc');
    if (!(await canWriteDoc(me, segs))) deny();
    const existing = await findDoc(ctx, path);
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

/** Nomes das contas para o app clínico. Médico: só ele e as famílias vinculadas; admin: todos. */
export const profiles = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const me = await viewer(ctx);
    const admin = await me.admin();
    if (!admin && (await me.role()) !== 'medico') deny();
    const out: Record<string, { name: string | null; isMe: boolean }> = {};
    for (const raw of ids.slice(0, 200)) {
      const id = ctx.db.normalizeId('users', raw);
      if (!id || (!admin && !(await me.cares(raw)))) continue;
      if (await ctx.db.get(id))
        out[raw] = { name: await displayName(ctx, id), isMe: id === me.userId };
    }
    return out;
  },
});
