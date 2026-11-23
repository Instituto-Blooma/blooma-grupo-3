import { RESPIRA, RespiraWordmark } from '@/components/respira-brand';

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: RESPIRA.bg, color: RESPIRA.ink, fontFamily: RESPIRA.sans }}
    >
      <div
        className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-lg"
        style={{ borderColor: '#CFE0DE' }}
      >
        <RespiraWordmark className="mb-6" />
        <h1 className="mb-2 text-2xl font-semibold" style={{ fontFamily: RESPIRA.serif }}>
          Página não encontrada
        </h1>
        <p className="mb-6" style={{ color: RESPIRA.ink2 }}>
          Este endereço não existe no RespiraKids.
        </p>
        <a
          href="/"
          className="inline-flex rounded-2xl px-5 py-3 font-bold text-white"
          style={{ background: RESPIRA.teal }}
        >
          Ir para o início
        </a>
      </div>
    </div>
  );
}
