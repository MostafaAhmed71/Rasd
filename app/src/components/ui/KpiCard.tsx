interface KpiCardProps {
  label: string
  value: string | number
  hint?: string
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div className="panel p-4 sm:p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold text-primary-dark">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  )
}
