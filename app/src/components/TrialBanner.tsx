import { formatTrialEndLabel, useTrialCountdown, TRIAL_DAYS } from '../hooks/useTrialCountdown'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[2.75rem] flex-col items-center rounded-md bg-white/15 px-1.5 py-1 backdrop-blur-sm sm:min-w-[3.25rem] sm:px-2">
      <span className="font-mono text-sm font-bold tabular-nums leading-none tracking-wide text-white sm:text-base">
        {value}
      </span>
      <span className="mt-0.5 text-[9px] font-medium text-white/75 sm:text-[10px]">{label}</span>
    </div>
  )
}

interface TrialBannerProps {
  /** نسخة مضغوطة لشاشة الدخول */
  compact?: boolean
}

export function TrialBanner({ compact = false }: TrialBannerProps) {
  const { days, hours, minutes, seconds, expired, totalMs } = useTrialCountdown()

  if (expired) return null

  const urgent = totalMs < 24 * 60 * 60 * 1000
  const barClass = urgent
    ? 'bg-gradient-to-l from-amber-800 via-amber-700 to-orange-800'
    : 'bg-gradient-to-l from-primary-dark via-primary to-primary-dark'

  if (compact) {
    return (
      <div
        className={`mb-4 overflow-hidden rounded-xl text-white shadow-lg ${barClass}`}
        role="status"
        aria-live="polite"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                فترة تجريبية
              </p>
              <p className="font-display mt-0.5 text-sm font-bold">مدة التجربة {TRIAL_DAYS} أيام</p>
            </div>
            <div className="flex shrink-0 gap-1.5" dir="ltr">
              <TimeUnit value={pad(days)} label="يوم" />
              <TimeUnit value={pad(hours)} label="ساعة" />
              <TimeUnit value={pad(minutes)} label="دقيقة" />
              <TimeUnit value={pad(seconds)} label="ثانية" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/65">ينتهي: {formatTrialEndLabel()}</p>
        </div>
        <div className="h-0.5 bg-white/20">
          <div
            className="h-full bg-white/70 transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.max(2, Math.min(100, (totalMs / (TRIAL_DAYS * 24 * 60 * 60 * 1000)) * 100))}%`,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`shrink-0 border-b border-white/10 text-white ${barClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-2.5">
        <div className="min-w-0 text-center sm:text-right">
          <p className="font-display text-sm font-bold sm:text-[15px]">
            أنت تستخدم نسخة تجريبية
            <span className="mx-1.5 font-normal text-white/50">·</span>
            <span className="font-semibold text-white/90">المدة {TRIAL_DAYS} أيام</span>
          </p>
          <p className="mt-0.5 hidden text-xs text-white/65 sm:block">
            ينتهي الوصول التلقائي في {formatTrialEndLabel()}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <span className="hidden text-xs font-medium text-white/70 md:inline">متبقي</span>
          <div className="flex gap-1.5" dir="ltr">
            <TimeUnit value={pad(days)} label="يوم" />
            <span className="self-center text-sm font-bold text-white/40">:</span>
            <TimeUnit value={pad(hours)} label="ساعة" />
            <span className="self-center text-sm font-bold text-white/40">:</span>
            <TimeUnit value={pad(minutes)} label="دقيقة" />
            <span className="self-center text-sm font-bold text-white/40">:</span>
            <TimeUnit value={pad(seconds)} label="ثانية" />
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-black/20">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${urgent ? 'bg-amber-200' : 'bg-emerald-300/80'}`}
          style={{
            width: `${Math.max(2, Math.min(100, (totalMs / (TRIAL_DAYS * 24 * 60 * 60 * 1000)) * 100))}%`,
          }}
        />
      </div>
    </div>
  )
}
