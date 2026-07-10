import type { ReactNode } from 'react'

interface PageMotionProps {
  children: ReactNode
  className?: string
}

export function PageMotion({ children, className = '' }: PageMotionProps) {
  return <div className={`animate-fade-up ${className}`}>{children}</div>
}
