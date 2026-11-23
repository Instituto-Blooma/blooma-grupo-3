import { createFileRoute, redirect } from '@tanstack/react-router';
import { AuthForm } from '@/components/auth-form';
import { RESPIRA, RespiraWordmark } from '@/components/respira-brand';
import { validateLoginSearch } from '@/lib/route-guards';

export const Route = createFileRoute('/login')({
  validateSearch: validateLoginSearch,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: search.redirect ?? '/' });
    }
  },
  component: LoginPage,
});

const FEATURES = [
  {
    title: 'Para famílias',
    text: 'Grave 20 segundos da respiração, marque os sintomas e receba uma orientação simples sobre o que fazer.',
  },
  {
    title: 'Para médicos',
    text: 'Acompanhe o histórico dos seus pacientes, ouça as gravações e mande orientações para a família.',
  },
  {
    title: 'Para hospitais',
    text: 'Monte a equipe médica e acompanhe quantas famílias cada médico atende.',
  },
];

function LoginPage() {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: RESPIRA.bg, color: RESPIRA.ink, fontFamily: RESPIRA.sans }}
    >
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10">
        <section className="space-y-6">
          <RespiraWordmark size="lg" />
          <h1
            className="text-3xl font-semibold leading-tight md:text-5xl"
            style={{ fontFamily: RESPIRA.serif }}
          >
            Respire com a gente.
          </h1>
          <p className="max-w-xl text-lg" style={{ color: RESPIRA.ink2 }}>
            O RespiraKids ajuda pais e responsáveis a acompanhar a respiração das crianças e a
            compartilhar tudo com o pediatra.
          </p>
          <ul className="hidden space-y-4 md:block">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span
                  className="mt-2 h-2.5 w-2.5 flex-none rounded-full"
                  style={{ background: RESPIRA.teal }}
                />
                <span>
                  <b>{f.title}.</b> <span style={{ color: RESPIRA.ink2 }}>{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="w-full rounded-3xl border bg-white p-6 shadow-lg md:p-10"
          style={{ borderColor: '#CFE0DE' }}
        >
          <h2 className="mb-2 text-2xl font-semibold" style={{ fontFamily: RESPIRA.serif }}>
            Entrar
          </h2>
          <p className="mb-6" style={{ color: RESPIRA.ink2 }}>
            Famílias, médicos e hospitais entram do mesmo jeito. Depois de entrar, você escolhe o
            tipo de conta.
          </p>
          <AuthForm />
          <p
            className="mt-6 rounded-2xl p-4 text-sm"
            style={{ background: '#FCE3DF', color: RESPIRA.ink }}
          >
            O RespiraKids não substitui o médico. Em emergência (lábios roxos, pausas na respiração,
            convulsão), ligue <b>192</b>.
          </p>
        </section>
      </div>
    </div>
  );
}
