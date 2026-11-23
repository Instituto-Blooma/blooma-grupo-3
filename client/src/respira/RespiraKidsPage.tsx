import { useEffect, useRef } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';
import { AuthLoadingScreen } from '@/components/auth-loading-screen';
import { createRespiraRuntime } from './cloud';
import { MARKUP, startRespira } from './legacy/respira-app.js';
import legacyCss from './legacy/respira.css?inline';

declare global {
  interface Window {
    claude?: ReturnType<typeof createRespiraRuntime>;
  }
}

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:opsz,wght,SOFT@9..144,500..700,0..100&display=swap';

/**
 * RespiraKids, do jeito que era no artefato: as telas e a lógica são o código original
 * (./legacy/respira-app.js). Esta página só liga o app ao login e ao banco do projeto.
 */
export function RespiraKidsPage() {
  const convex = useConvex();
  const me = useQuery(api.respira.me);
  const hostRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuthActions();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const meId = me?.id;
  const meAdmin = me?.admin;
  const meRole = me?.role;
  const meName = me?.name ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !meId || meAdmin === undefined || !meRole) return;

    // Cada tipo de conta abre na sua área (as famílias, no app das famílias).
    if (!location.hash) {
      if (meRole === 'medico') history.replaceState(null, '', '#medico');
      if (meRole === 'hospital') history.replaceState(null, '', '#hospital');
    }

    const style = document.createElement('style');
    style.dataset.respira = '';
    style.textContent = legacyCss;
    document.head.appendChild(style);

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS_HREF;
    document.head.appendChild(fonts);

    const previousTitle = document.title;
    window.claude = createRespiraRuntime(
      convex,
      { id: meId, admin: meAdmin, role: meRole, name: meName },
      { signOut: () => signOutRef.current() }
    );
    host.innerHTML = MARKUP;
    const stop = startRespira();

    return () => {
      stop();
      host.innerHTML = '';
      delete window.claude;
      style.remove();
      fonts.remove();
      document.title = previousTitle;
    };
  }, [convex, meId, meAdmin, meRole, meName]);

  if (me === undefined) {
    return <AuthLoadingScreen />;
  }
  return <div ref={hostRef} />;
}
