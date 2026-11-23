import { useEffect, useRef } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
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

  const meId = me?.id;
  const meAdmin = me?.admin;
  const meName = me?.name ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !meId || meAdmin === undefined) return;

    const style = document.createElement('style');
    style.dataset.respira = '';
    style.textContent = legacyCss;
    document.head.appendChild(style);

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS_HREF;
    document.head.appendChild(fonts);

    const previousTitle = document.title;
    window.claude = createRespiraRuntime(convex, { id: meId, admin: meAdmin, name: meName });
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
  }, [convex, meId, meAdmin, meName]);

  if (me === undefined) {
    return <div className="p-8 text-center text-muted-foreground">Carregando RespiraKids…</div>;
  }
  return <div ref={hostRef} />;
}
