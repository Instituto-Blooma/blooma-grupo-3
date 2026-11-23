import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),
    onboardingStatus: v.optional(
      v.union(v.literal('pending'), v.literal('invited'), v.literal('active'))
    ),
    invitedAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone']),

  impersonationSessions: defineTable({
    adminUserId: v.id('users'),
    targetUserId: v.id('users'),
    startedAt: v.number(),
    expiresAt: v.number(),
    endedAt: v.optional(v.number()),
  }).index('by_admin', ['adminUserId']),

  todos: defineTable({
    organizationId: v.string(),
    userId: v.id('users'),
    createdBy: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    dueDate: v.optional(v.float64()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index('by_org', ['organizationId'])
    .index('by_org_and_user', ['organizationId', 'userId'])
    .index('by_user', ['userId'])
    .index('by_user_and_completed', ['userId', 'completed'])
    .index('by_user_and_priority', ['userId', 'priority']),

  collabMarkdown: defineTable({
    organizationId: v.string(),
    documentId: v.string(),
    markdown: v.string(),
    updatedAt: v.number(),
    updatedBy: v.id('users'),
  })
    .index('by_documentId', ['documentId'])
    .index('by_org_and_document', ['organizationId', 'documentId']),

  /**
   * RespiraKids: documentos do app (famílias, registros, áudios, validações, retornos),
   * guardados por caminho, como no banco do artefato original. Ex.:
   * "familias/<userId>", "familias/<userId>/registros/<id>", "validacoes/<id>", "retornos/<userId>".
   */
  respiraDocs: defineTable({
    path: v.string(),
    collection: v.string(),
    /** Conta da família dona do dado (para o médico vinculado encontrar só os pacientes dele). */
    family: v.optional(v.string()),
    data: v.any(),
    updatedAt: v.number(),
    updatedBy: v.id('users'),
  })
    .index('by_path', ['path'])
    .index('by_collection', ['collection'])
    .index('by_collection_and_family', ['collection', 'family']),

  /** Tipo de conta: família (padrão), médico ou hospital. */
  respiraProfiles: defineTable({
    userId: v.id('users'),
    role: v.union(v.literal('familia'), v.literal('medico'), v.literal('hospital')),
    nome: v.string(),
    crm: v.optional(v.string()),
    especialidade: v.optional(v.string()),
    cidade: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  /** Família ↔ médico: o médico vê todo o histórico das crianças dessa família. */
  respiraLinks: defineTable({
    familyId: v.id('users'),
    doctorId: v.id('users'),
    via: v.union(v.literal('codigo'), v.literal('convite')),
    createdAt: v.number(),
  })
    .index('by_family', ['familyId'])
    .index('by_doctor', ['doctorId'])
    .index('by_family_and_doctor', ['familyId', 'doctorId']),

  /**
   * Código de vínculo: um lado gera, o outro digita (vira "pedido"),
   * e quem gerou aprova ou recusa.
   */
  respiraCodes: defineTable({
    code: v.string(),
    createdBy: v.id('users'),
    creatorRole: v.union(v.literal('familia'), v.literal('medico')),
    status: v.union(
      v.literal('aberto'),
      v.literal('pedido'),
      v.literal('aprovado'),
      v.literal('recusado'),
      v.literal('cancelado')
    ),
    requestedBy: v.optional(v.id('users')),
    requestedAt: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_creator', ['createdBy'])
    .index('by_requester', ['requestedBy']),

  /**
   * Convites por e-mail: médico convida família ("familia")
   * ou hospital convida médico ("hospital"). Quem recebe aceita ou recusa.
   */
  respiraInvites: defineTable({
    kind: v.union(v.literal('familia'), v.literal('hospital')),
    fromId: v.id('users'),
    email: v.string(),
    status: v.union(
      v.literal('pendente'),
      v.literal('aceito'),
      v.literal('recusado'),
      v.literal('cancelado')
    ),
    toId: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_email_and_status', ['email', 'status'])
    .index('by_from_and_status', ['fromId', 'status']),

  /** Médicos que fazem parte de um hospital (o médico aceitou o convite). */
  respiraHospitalDoctors: defineTable({
    hospitalId: v.id('users'),
    doctorId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_hospital', ['hospitalId'])
    .index('by_doctor', ['doctorId'])
    .index('by_hospital_and_doctor', ['hospitalId', 'doctorId']),
});

export default schema;
