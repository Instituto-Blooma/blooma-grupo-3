import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RESPIRA, RespiraWordmark } from '@/components/respira-brand';

/** Chave em que o convite fica guardado até a pessoa entrar (lida pelo app em respira-app.js). */
const RESPIRA_INVITE_KEY = 'respirakids:convite';

export const Route = createFileRoute('/vincular/$code')({
  component: InvitePage,
});

/**
 * Link de convite (família ↔ médico). Guarda o código no aparelho e manda para o app:
 * se a pessoa não estiver logada, passa pelo login antes. Depois de entrar, o app
 * envia o pedido de vínculo, e quem criou o convite aprova.
 */
function InvitePage() {
  const { code } = Route.useParams();

  useEffect(() => {
    try {
      localStorage.setItem(RESPIRA_INVITE_KEY, code.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    } catch {
      // sem armazenamento: a pessoa ainda pode digitar o código no app
    }
    const t = setTimeout(() => window.location.replace('/'), 600);
    return () => clearTimeout(t);
  }, [code]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ background: RESPIRA.bg, color: RESPIRA.ink, fontFamily: RESPIRA.sans }}
    >
      <RespiraWordmark size="lg" />
      <p className="text-lg">Você recebeu um convite no RespiraKids.</p>
      <p style={{ color: RESPIRA.ink2 }}>Abrindo o app…</p>
    </div>
  );
}
