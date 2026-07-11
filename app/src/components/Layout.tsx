import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_NAME } from '../lib/brand'
import { ROLE_LABELS } from '../lib/roles'

/** توافق خلفي — الشاشات الجديدة تستخدم AppShell */
interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  const { profile, signOut } = useAuth()
  const displayName = profile?.full_name ?? ''
  const roleLabel = profile ? ROLE_LABELS[profile.role] ?? profile.role : ''

  return (
    <div className="app-shell">
      <header className="page-header-bar animate-slide-down">
        <div className="mx-auto max-w-7xl px-3 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-base font-bold text-white sm:text-xl">
                {PLATFORM_NAME}
              </h1>
              <p className="mt-0.5 truncate text-xs text-white/80 sm:text-sm">
                {title}
                {profile && displayName && (
                  <>
                    <span className="mx-1.5 opacity-50">·</span>
                    {displayName}
                    <span className="mx-1.5 opacity-50">·</span>
                    {roleLabel}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="touch-target shrink-0 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95 sm:px-4 sm:text-sm"
            >
              خروج
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-7">{children}</main>
    </div>
  )
}
