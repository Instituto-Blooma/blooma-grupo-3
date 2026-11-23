import type { ConvexReactClient } from 'convex/react';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';

/**
 * Fornece ao código original do RespiraKids a mesma interface que ele usava no artefato
 * (`window.claude.use("db")` e `window.claude.use("user")`), agora guardando no Convex.
 * Os demais recursos do artefato ("sample" = assistente com IA, "downloads") não existem aqui;
 * o app já tinha alternativas para eles (respostas prontas e download pelo navegador).
 */

type DocData = Record<string, unknown>;
type Snap = { id: string; exists: boolean; data: () => DocData | null };
type Me = { id: string; admin: boolean; name: string | null };

const lastSegment = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Erros no formato que o app espera: `{ code }`. */
function toAppError(e: unknown): { code: string; message: string } {
  const data = (e as { data?: { code?: string; message?: string } })?.data;
  if (data?.code) return { code: data.code, message: data.message ?? data.code };
  return { code: 'unavailable', message: e instanceof Error ? e.message : String(e) };
}

function docSnap(path: string, r: { exists: boolean; data: unknown }): Snap {
  return {
    id: lastSegment(path),
    exists: r.exists,
    data: () => (r.exists ? (structuredClone(r.data) as DocData) : null),
  };
}

function collectionSnap(rows: { id: string; data: unknown }[]) {
  return {
    docs: rows.map((r) => ({
      id: r.id,
      exists: true,
      data: () => structuredClone(r.data) as DocData,
    })),
    metadata: { fromCache: false },
  };
}

export function createRespiraRuntime(client: ConvexReactClient, me: Me) {
  async function run<T>(p: Promise<T>): Promise<T> {
    try {
      return await p;
    } catch (e) {
      throw toAppError(e);
    }
  }

  function watch<Q extends FunctionReference<'query'>>(
    fn: Q,
    args: FunctionArgs<Q>,
    onData: (value: FunctionReturnType<Q>) => void,
    onError?: (e: { code: string; message: string }) => void
  ) {
    const w = client.watchQuery(fn, args as never);
    const emit = () => {
      try {
        const value = w.localQueryResult();
        if (value !== undefined) onData(value);
      } catch (e) {
        onError?.(toAppError(e));
      }
    };
    const unsubscribe = w.onUpdate(emit);
    emit();
    return unsubscribe;
  }

  function collection(path: string) {
    return {
      get: async () =>
        collectionSnap(await run(client.query(api.respira.listCollection, { path }))),
      onSnapshot: (
        cb: (s: ReturnType<typeof collectionSnap>) => void,
        onError?: (e: { code: string }) => void
      ) => watch(api.respira.listCollection, { path }, (rows) => cb(collectionSnap(rows)), onError),
    };
  }

  function doc(path: string) {
    return {
      id: lastSegment(path),
      path,
      get: async () => docSnap(path, await run(client.query(api.respira.getDoc, { path }))),
      set: (data: DocData) => run(client.mutation(api.respira.setDoc, { path, data })),
      delete: () => run(client.mutation(api.respira.deleteDoc, { path })),
      collection: (name: string) => collection(`${path}/${name}`),
      onSnapshot: (cb: (s: Snap) => void, onError?: (e: { code: string }) => void) =>
        watch(api.respira.getDoc, { path }, (r) => cb(docSnap(path, r)), onError),
    };
  }

  const db = { doc, collection };

  const user = {
    id: async () => me.id,
    canEdit: async () => me.admin,
    profiles: (ids: string[]) => run(client.query(api.respira.profiles, { ids })),
  };

  return {
    use: async (name: string) => {
      if (name === 'db') return db;
      if (name === 'user') return user;
      throw { code: 'not_granted', message: `Recurso indisponível: ${name}` };
    },
  };
}
