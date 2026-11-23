import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { isPlatformAdmin, resolveActingUserId } from './lib/auth';
import { normalizeEmail } from './lib/users';
import {
  MAX_LINKS,
  displayName,
  findLink,
  getRespiraProfile,
  getRespiraRole,
  type RespiraRole,
} from './lib/respira';

/**
 * Contas do RespiraKids: tipo de conta (família, médico, hospital), vínculo família ↔ médico
 * (por código com aprovação ou por convite de e-mail) e equipe de médicos do hospital.
 */

const CODE_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I/L
const MAX_LIST = 200;

type Ctx = QueryCtx | MutationCtx;

function fail(message: string): never {
  throw new ConvexError({ code: 'invalid_argument', message });
}

async function requireMe(ctx: Ctx) {
  const userId = await resolveActingUserId(ctx);
  if (!userId) throw new ConvexError({ code: 'unauthenticated', message: 'Entre na sua conta.' });
  return userId;
}

async function myEmail(ctx: Ctx, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  return user?.email ? normalizeEmail(user.email) : null;
}

/** Aceita "abc-123", "ABC 123" etc. */
function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

async function person(ctx: Ctx, userId: Id<'users'>) {
  const profile = await getRespiraProfile(ctx, userId);
  const user = await ctx.db.get(userId);
  return {
    id: userId as string,
    nome: await displayName(ctx, userId),
    role: (profile?.role ?? 'familia') as RespiraRole,
    crm: profile?.crm ?? null,
    especialidade: profile?.especialidade ?? null,
    email: user?.email ?? null,
  };
}

async function hospitalsOf(ctx: Ctx, doctorId: Id<'users'>) {
  const rows = await ctx.db
    .query('respiraHospitalDoctors')
    .withIndex('by_doctor', (q) => q.eq('doctorId', doctorId))
    .take(MAX_LIST);
  return Promise.all(
    rows.map(async (r) => ({
      id: r.hospitalId as string,
      nome: await displayName(ctx, r.hospitalId),
      desde: r.createdAt,
    }))
  );
}

/** Nomes das crianças que a família guardou no banco (só se ela autorizou guardar). */
async function childrenOf(ctx: Ctx, familyId: Id<'users'>) {
  const doc = await ctx.db
    .query('respiraDocs')
    .withIndex('by_path', (q) => q.eq('path', `familias/${familyId}`))
    .unique();
  const data = (doc?.data ?? {}) as {
    criancas?: { nome?: string; age?: number | string }[];
    total?: number;
    consentimento?: { cloud?: boolean };
  };
  return {
    criancas: (data.criancas ?? []).map((k) => ({ nome: k.nome ?? 'Criança', age: k.age ?? null })),
    registros: data.total ?? 0,
    compartilhando: !!doc && data.consentimento?.cloud !== false,
  };
}

async function codeView(ctx: Ctx, c: Doc<'respiraCodes'>) {
  return {
    id: c._id as string,
    code: c.code,
    status: c.status,
    expiresAt: c.expiresAt,
    pedido: c.requestedBy ? await person(ctx, c.requestedBy) : null,
  };
}

/* ---------------------------------------------------------------- consultas */

/** Tudo que as telas de conta e vínculos precisam, conforme o tipo de conta. */
export const painel = query({
  args: {},
  handler: async (ctx) => {
    const userId = await resolveActingUserId(ctx);
    if (!userId) return null;
    const profile = await getRespiraProfile(ctx, userId);
    const role: RespiraRole = profile?.role ?? 'familia';
    const email = await myEmail(ctx, userId);
    const user = await ctx.db.get(userId);

    const me = {
      id: userId as string,
      role,
      temPerfil: !!profile,
      nome: profile?.nome ?? user?.name ?? '',
      crm: profile?.crm ?? '',
      especialidade: profile?.especialidade ?? '',
      cidade: profile?.cidade ?? '',
      email,
      admin: await isPlatformAdmin(ctx, userId),
    };

    // Códigos que eu gerei (abertos ou com pedido esperando minha aprovação).
    const mine = await ctx.db
      .query('respiraCodes')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .order('desc')
      .take(20);
    const meusCodigos = await Promise.all(
      mine
        .filter((c) => c.status === 'aberto' || c.status === 'pedido')
        .map((c) => codeView(ctx, c))
    );

    // Códigos que eu digitei e ainda esperam a aprovação do outro lado.
    const asked = await ctx.db
      .query('respiraCodes')
      .withIndex('by_requester', (q) => q.eq('requestedBy', userId))
      .order('desc')
      .take(20);
    const meusPedidos = await Promise.all(
      asked
        .filter((c) => c.status === 'pedido')
        .map(async (c) => ({
          id: c._id as string,
          code: c.code,
          de: await person(ctx, c.createdBy),
        }))
    );

    const received = email
      ? await ctx.db
          .query('respiraInvites')
          .withIndex('by_email_and_status', (q) => q.eq('email', email).eq('status', 'pendente'))
          .take(MAX_LIST)
      : [];
    const convitesRecebidos = await Promise.all(
      received.map(async (i) => ({
        id: i._id as string,
        kind: i.kind,
        de: await person(ctx, i.fromId),
      }))
    );
    const sent = await ctx.db
      .query('respiraInvites')
      .withIndex('by_from_and_status', (q) => q.eq('fromId', userId).eq('status', 'pendente'))
      .take(MAX_LIST);
    const convitesEnviados = sent.map((i) => ({
      id: i._id as string,
      kind: i.kind,
      email: i.email,
      criadoEm: i.createdAt,
    }));

    const base = { me, meusCodigos, meusPedidos, convitesRecebidos, convitesEnviados };

    if (role === 'medico') {
      const links = await ctx.db
        .query('respiraLinks')
        .withIndex('by_doctor', (q) => q.eq('doctorId', userId))
        .take(MAX_LINKS);
      const pacientes = await Promise.all(
        links.map(async (l) => ({
          ...(await person(ctx, l.familyId)),
          desde: l.createdAt,
          via: l.via,
          ...(await childrenOf(ctx, l.familyId)),
        }))
      );
      return { ...base, pacientes, hospitais: await hospitalsOf(ctx, userId) };
    }

    if (role === 'hospital') {
      const team = await ctx.db
        .query('respiraHospitalDoctors')
        .withIndex('by_hospital', (q) => q.eq('hospitalId', userId))
        .take(MAX_LIST);
      const equipe = await Promise.all(
        team.map(async (t) => {
          const patients = await ctx.db
            .query('respiraLinks')
            .withIndex('by_doctor', (q) => q.eq('doctorId', t.doctorId))
            .take(MAX_LINKS);
          return {
            ...(await person(ctx, t.doctorId)),
            desde: t.createdAt,
            pacientes: patients.length,
          };
        })
      );
      return { ...base, equipe };
    }

    const links = await ctx.db
      .query('respiraLinks')
      .withIndex('by_family', (q) => q.eq('familyId', userId))
      .take(MAX_LIST);
    const medicos = await Promise.all(
      links.map(async (l) => ({
        ...(await person(ctx, l.doctorId)),
        desde: l.createdAt,
        via: l.via,
        hospitais: (await hospitalsOf(ctx, l.doctorId)).map((h) => h.nome),
      }))
    );
    return { ...base, medicos };
  },
});

/* ---------------------------------------------------------------- perfil */

export const salvarPerfil = mutation({
  args: {
    role: v.union(v.literal('familia'), v.literal('medico'), v.literal('hospital')),
    nome: v.string(),
    crm: v.optional(v.string()),
    especialidade: v.optional(v.string()),
    cidade: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const nome = args.nome.trim().slice(0, 120);
    if (!nome) fail('Escreva o nome.');
    const crm = args.crm?.trim().slice(0, 40) || undefined;
    if (args.role === 'medico' && !crm) fail('Para conta de médico, informe o CRM.');

    const current = await getRespiraProfile(ctx, userId);
    const currentRole = current?.role ?? 'familia';
    if (currentRole !== args.role) {
      // Trocar o tipo de conta com vínculos ativos deixaria dados acessíveis a quem não devia.
      const asFamily = await ctx.db
        .query('respiraLinks')
        .withIndex('by_family', (q) => q.eq('familyId', userId))
        .first();
      const asDoctor = await ctx.db
        .query('respiraLinks')
        .withIndex('by_doctor', (q) => q.eq('doctorId', userId))
        .first();
      const inTeam =
        (await ctx.db
          .query('respiraHospitalDoctors')
          .withIndex('by_doctor', (q) => q.eq('doctorId', userId))
          .first()) ??
        (await ctx.db
          .query('respiraHospitalDoctors')
          .withIndex('by_hospital', (q) => q.eq('hospitalId', userId))
          .first());
      if (asFamily || asDoctor || inTeam) {
        fail(
          'Desfaça os vínculos (médicos, pacientes ou hospital) antes de mudar o tipo de conta.'
        );
      }
    }

    const fields = {
      role: args.role,
      nome,
      crm: args.role === 'medico' ? crm : undefined,
      especialidade: args.role === 'medico' ? args.especialidade?.trim().slice(0, 80) : undefined,
      cidade: args.cidade?.trim().slice(0, 80) || undefined,
      updatedAt: Date.now(),
    };
    if (current) await ctx.db.patch(current._id, fields);
    else await ctx.db.insert('respiraProfiles', { userId, ...fields });
    return null;
  },
});

/* ---------------------------------------------------------------- vínculo por código */

export const gerarCodigo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireMe(ctx);
    const role = await getRespiraRole(ctx, userId);
    if (role === 'hospital') fail('Hospitais adicionam médicos por convite de e-mail.');

    // Um código aberto por vez: o anterior deixa de valer.
    const open = await ctx.db
      .query('respiraCodes')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .order('desc')
      .take(20);
    for (const c of open)
      if (c.status === 'aberto') await ctx.db.patch(c._id, { status: 'cancelado' });

    let code = newCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('respiraCodes')
        .withIndex('by_code', (q) => q.eq('code', code))
        .first();
      if (!clash || clash.expiresAt < Date.now()) break;
      code = newCode();
    }
    const now = Date.now();
    await ctx.db.insert('respiraCodes', {
      code,
      createdBy: userId,
      creatorRole: role,
      status: 'aberto',
      expiresAt: now + CODE_TTL_MS,
      createdAt: now,
    });
    return code;
  },
});

export const usarCodigo = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const role = await getRespiraRole(ctx, userId);
    const code = normalizeCode(args.code);
    if (code.length !== 6) fail('O código tem 6 letras e números.');

    const found = await ctx.db
      .query('respiraCodes')
      .withIndex('by_code', (q) => q.eq('code', code))
      .order('desc')
      .first();
    if (!found || found.expiresAt < Date.now() || found.status === 'cancelado') {
      fail('Código não encontrado ou vencido. Peça um código novo.');
    }
    if (found.createdBy === userId)
      fail('Este código foi gerado por você. Mande para a outra pessoa.');
    if (found.status !== 'aberto') fail('Este código já foi usado. Peça um código novo.');

    const needed: RespiraRole = found.creatorRole === 'familia' ? 'medico' : 'familia';
    if (role !== needed) {
      fail(
        needed === 'medico'
          ? 'Este código é de uma família: só uma conta de médico pode usá-lo.'
          : 'Este código é de um médico: use-o com a conta da família.'
      );
    }
    const familyId = needed === 'medico' ? found.createdBy : userId;
    const doctorId = needed === 'medico' ? userId : found.createdBy;
    if (await findLink(ctx, familyId, doctorId)) fail('Vocês já estão vinculados.');

    await ctx.db.patch(found._id, {
      status: 'pedido',
      requestedBy: userId,
      requestedAt: Date.now(),
    });
    return { aguardando: await displayName(ctx, found.createdBy) };
  },
});

export const responderPedido = mutation({
  args: { codeId: v.id('respiraCodes'), aprovar: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const c = await ctx.db.get(args.codeId);
    if (!c || c.createdBy !== userId) fail('Pedido não encontrado.');
    if (c.status !== 'pedido' || !c.requestedBy) fail('Este pedido já foi respondido.');
    if (!args.aprovar) {
      await ctx.db.patch(c._id, { status: 'recusado' });
      return null;
    }
    const familyId = c.creatorRole === 'familia' ? c.createdBy : c.requestedBy;
    const doctorId = c.creatorRole === 'familia' ? c.requestedBy : c.createdBy;
    if (!(await findLink(ctx, familyId, doctorId))) {
      await ctx.db.insert('respiraLinks', {
        familyId,
        doctorId,
        via: 'codigo',
        createdAt: Date.now(),
      });
    }
    await ctx.db.patch(c._id, { status: 'aprovado' });
    return null;
  },
});

export const cancelarCodigo = mutation({
  args: { codeId: v.id('respiraCodes') },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const c = await ctx.db.get(args.codeId);
    if (!c || (c.createdBy !== userId && c.requestedBy !== userId)) fail('Código não encontrado.');
    if (c.status === 'aberto' || c.status === 'pedido') {
      await ctx.db.patch(c._id, { status: 'cancelado' });
    }
    return null;
  },
});

/* ---------------------------------------------------------------- convites por e-mail */

export const convidar = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const role = await getRespiraRole(ctx, userId);
    const kind = role === 'medico' ? 'familia' : role === 'hospital' ? 'hospital' : null;
    if (!kind) fail('Só médicos e hospitais enviam convites por e-mail.');
    const email = normalizeEmail(args.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail inválido.');
    if (email === (await myEmail(ctx, userId))) fail('Esse é o seu próprio e-mail.');

    const pending = await ctx.db
      .query('respiraInvites')
      .withIndex('by_from_and_status', (q) => q.eq('fromId', userId).eq('status', 'pendente'))
      .take(MAX_LIST);
    if (pending.some((i) => i.email === email)) fail('Você já convidou esse e-mail.');

    await ctx.db.insert('respiraInvites', {
      kind,
      fromId: userId,
      email,
      status: 'pendente',
      createdAt: Date.now(),
    });
    return null;
  },
});

export const cancelarConvite = mutation({
  args: { inviteId: v.id('respiraInvites') },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.fromId !== userId) fail('Convite não encontrado.');
    if (invite.status === 'pendente') await ctx.db.patch(invite._id, { status: 'cancelado' });
    return null;
  },
});

export const responderConvite = mutation({
  args: { inviteId: v.id('respiraInvites'), aceitar: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const invite = await ctx.db.get(args.inviteId);
    const email = await myEmail(ctx, userId);
    if (!invite || !email || invite.email !== email) fail('Convite não encontrado.');
    if (invite.status !== 'pendente') fail('Este convite já foi respondido.');

    if (!args.aceitar) {
      await ctx.db.patch(invite._id, { status: 'recusado', toId: userId });
      return null;
    }

    const role = await getRespiraRole(ctx, userId);
    if (invite.kind === 'familia') {
      if (role !== 'familia') fail('Este convite é para uma conta de família.');
      if (!(await findLink(ctx, userId, invite.fromId))) {
        await ctx.db.insert('respiraLinks', {
          familyId: userId,
          doctorId: invite.fromId,
          via: 'convite',
          createdAt: Date.now(),
        });
      }
    } else {
      if (role !== 'medico')
        fail('Para entrar na equipe do hospital, crie primeiro a sua conta de médico.');
      const already = await ctx.db
        .query('respiraHospitalDoctors')
        .withIndex('by_hospital_and_doctor', (q) =>
          q.eq('hospitalId', invite.fromId).eq('doctorId', userId)
        )
        .first();
      if (!already) {
        await ctx.db.insert('respiraHospitalDoctors', {
          hospitalId: invite.fromId,
          doctorId: userId,
          createdAt: Date.now(),
        });
      }
    }
    await ctx.db.patch(invite._id, { status: 'aceito', toId: userId });
    return null;
  },
});

/* ---------------------------------------------------------------- desfazer vínculos */

/** A família remove um médico, ou o médico remove uma família. */
export const desvincular = mutation({
  args: { outroId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const other = ctx.db.normalizeId('users', args.outroId);
    if (!other) fail('Conta não encontrada.');
    const link = (await findLink(ctx, userId, other)) ?? (await findLink(ctx, other, userId));
    if (!link) fail('Vínculo não encontrado.');
    await ctx.db.delete(link._id);
    return null;
  },
});

/** O hospital tira um médico da equipe, ou o médico sai do hospital. */
export const sairDaEquipe = mutation({
  args: { outroId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireMe(ctx);
    const other = ctx.db.normalizeId('users', args.outroId);
    if (!other) fail('Conta não encontrada.');
    const row =
      (await ctx.db
        .query('respiraHospitalDoctors')
        .withIndex('by_hospital_and_doctor', (q) =>
          q.eq('hospitalId', userId).eq('doctorId', other)
        )
        .first()) ??
      (await ctx.db
        .query('respiraHospitalDoctors')
        .withIndex('by_hospital_and_doctor', (q) =>
          q.eq('hospitalId', other).eq('doctorId', userId)
        )
        .first());
    if (!row) fail('Vínculo com o hospital não encontrado.');
    await ctx.db.delete(row._id);
    return null;
  },
});
