import { PLATFORM_COPYRIGHT, PLATFORM_DEVELOPER } from '../lib/brand'

interface CreditFooterProps {
  /** نسخة أوضح لشاشة الدخول */
  variant?: 'shell' | 'auth'
}

export function CreditFooter({ variant = 'shell' }: CreditFooterProps) {
  if (variant === 'auth') {
    return (
      <footer className="mt-5 space-y-1.5 text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-white/95">
          {PLATFORM_DEVELOPER}
        </p>
        <p className="text-[11px] leading-relaxed text-white/65">{PLATFORM_COPYRIGHT}</p>
      </footer>
    )
  }

  return (
    <footer className="shrink-0 border-t border-border bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-1.5 text-center sm:flex-row sm:text-right">
        <p className="font-display text-sm font-semibold text-primary-dark">
          {PLATFORM_DEVELOPER}
        </p>
        <p className="text-xs text-text-secondary">{PLATFORM_COPYRIGHT}</p>
      </div>
    </footer>
  )
}
