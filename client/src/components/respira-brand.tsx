import { cn } from '@/lib/utils';

/** Cores e fontes do RespiraKids (as mesmas do app original). */
export const RESPIRA = {
  teal: '#2E6A68',
  tealSoft: '#D8EAE8',
  bg: '#EEF5F4',
  ink: '#173A39',
  ink2: '#4B6765',
  serif: '"Fraunces", "Iowan Old Style", Georgia, serif',
  sans: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
} as const;

type RespiraWordmarkProps = { className?: string; size?: 'sm' | 'md' | 'lg' };

export function RespiraWordmark({ className, size = 'md' }: RespiraWordmarkProps) {
  const logo = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-16 w-16' }[size];
  const text = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[size];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img src="/respirakids-logo.png" alt="" className={cn('rounded-full', logo)} />
      <span
        className={cn('font-semibold tracking-tight', text)}
        style={{ fontFamily: RESPIRA.serif, color: RESPIRA.teal }}
      >
        RespiraKids
      </span>
    </div>
  );
}
