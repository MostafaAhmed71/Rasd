interface ProgressBarProps {
  value: number
  className?: string
  showLabel?: boolean
}

const LOW_THRESHOLD = 60

export function ProgressBar({ value, className = '', showLabel = true }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const barColor = pct < LOW_THRESHOLD ? 'bg-progress-low' : 'bg-progress-high'

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
        {showLabel && <span>الإنجاز</span>}
        <span className="font-semibold text-text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
