interface AlertProps {
  type: 'success' | 'error'
  children: React.ReactNode
  className?: string
}

export function Alert({ type, children, className = '' }: AlertProps) {
  return (
    <div
      role="status"
      className={`alert mb-4 ${type === 'success' ? 'alert-success' : 'alert-error'} ${className}`}
    >
      {children}
    </div>
  )
}
