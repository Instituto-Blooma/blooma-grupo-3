import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { isPlatformAdmin, resolveActingUserId } from './lib/auth';

/**
 * Banco do RespiraKids.
 *
 * O app guarda documentos por caminho ("coleção/documento/coleção/documento"), como no banco
 * do artefato original. As regras de acesso são as mesmas de lá:
 *  - familias/<eu>/...      a própria família lê e escreve; profissionais (admins) leem e escrevem
 *  - familias (lista)       só profissionais
 *  - retornos/<eu>          a família lê; só profissionais escrevem
 *  - validacoes/...         só profissionais
 *  - qualquer outro caminho só profissionais
 * "Profissional" = admin da plataforma (veja PLATFORM_ADMIN_EMAILS).
 */

const MAX_LIST = 1000;
const SEGMENT = /^[A-Za-z0-9_\-.~:@+]{1,180}$/;

type Ctx = QueryCtx | MutationCtx;
type Viewer = { userId: Id<'users'>; admin: () => Promise<boolean> };

function deny(): never {
  throw new ConvexError({ code: 'invalid_argument', message: 'Sem permissão para este dado.' });
}

async function viewer(ctx: Ctx): Promise<Viewer> {
  const userId = await resolveActingUserId(ctx);
  if (!userId) {
    throw new ConvexError({ code: 'unauthenticated', message: 'Entre na sua conta.' });
  }
  let cached: boolean | null = null;
  return {
    userId,
    admin: async () => (cached ??= await isPlatformAdmin(ctx, userId)),
  };
}

function segments(path: string, kind: 'doc' | 'collection'): string[] {
  const segs = path.split('/');
  const evenOk = kind === 'doc' ? segs.length % 2 === 0 : segs.length % 2 === 1;
  if (!evenOk || segs.length > 6 || !segs.every((s) => SEGMENT.test(s))) {
    throw new ConvexError({ code: 'invalid_argument', message: `Caminho inválido: ${path}` });
  }
  return segs;
}

/** Dono do documento, quando o caminho pertence a uma família (familias/<id> ou retornos/<id>). */
function ownerOf(segs: string[]): string | null {
  return segs[0] === 'familias' || segs[0] === 'retornos' ? segs[1] : null;
}

async function canReadDoc(me: Viewer, segs: string[]) {
  return ownerOf(segs) === me.userId || (await me.admin());
}

async function canWriteDoc(me: Viewer, segs: string[]) {
  return (segs[0] === 'familias' && segs[1] === me.userId) || (await me.admin());
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
    // Coleções do topo (ex.: "familias") só para profissionais; subcoleções seguem o documento pai.
    const allowed = segs.length === 1 ? await me.admin() : await canReadDoc(me, segs.slice(0, -1));
    if (!allowed) deny();
    const docs = await ctx.db
      .query('respiraDocs')
      .withIndex('by_collection', (q) => q.eq('collection', path))
      .take(MAX_LIST);
    return docs.map((d) => ({ id: d.path.slice(path.length + 1), data: d.data }));
  },
});

export const setDoc = mutation({
  args: { path: v.string(), data: v.any() },
  handler: async (ctx, { path, data }) => {
    const me = await viewer(ctx);
    const segs = segments(path, 'doc');
    if (!(await canWriteDoc(me, segs))) deny();
    const existing = await findDoc(ctx, path);
    const fields = { data, updatedAt: Date.now(), updatedBy: me.userId };
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

/** Nomes das contas, para o app clínico mostrar quem é cada família. Só profissionais. */
export const profiles = query({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const me = await viewer(ctx);
    if (!(await me.admin())) deny();
    const out: Record<string, { name: string | null; isMe: boolean }> = {};
    for (const raw of ids.slice(0, 200)) {
      const id = ctx.db.normalizeId('users', raw);
      if (!id) continue;
      const user = await ctx.db.get(id);
      if (user) out[raw] = { name: user.name ?? user.email ?? null, isMe: id === me.userId };
    }
    return out;
  },
});
