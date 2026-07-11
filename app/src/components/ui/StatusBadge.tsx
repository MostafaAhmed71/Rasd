type BadgeTone = 'success' | 'warning' | 'neutral'

interface StatusBadgeProps {
  label: string
  tone?: BadgeTone
}

const toneClass: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  neutral: 'bg-border/60 text-text-secondary',
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  )
}
