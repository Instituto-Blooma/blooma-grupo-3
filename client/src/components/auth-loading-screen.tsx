import { RESPIRA, RespiraWordmark } from '@/components/respira-brand';

export function AuthLoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: RESPIRA.bg }}
      data-testid="auth-loading"
      aria-busy="true"
    >
      <RespiraWordmark size="lg" />
    </div>
  );
}
