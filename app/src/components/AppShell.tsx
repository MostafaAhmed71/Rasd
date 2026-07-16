import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_NAME, PLATFORM_SHORT_NAME } from '../lib/brand'
import { ROLE_LABELS } from '../lib/roles'
import { PageMotion } from './PageMotion'
import { CreditFooter } from './CreditFooter'
import { Avatar } from './ui/Avatar'

export interface NavItem {
  to: string
  label: string
  end?: boolean
}

interface AppShellProps {
  title: string
  subtitle?: string
  navItems: NavItem[]
  children?: ReactNode
}

export function AppShell({ title, subtitle, navItems, children }: AppShellProps) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const displayName = profile?.full_name ?? 'مستخدم'
  const roleLabel = profile ? ROLE_LABELS[profile.role] ?? profile.role : ''

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="page-header-bar shrink-0">
        <div className="px-4 py-3 sm:px-6">
          <h1 className="font-display text-base font-bold text-white sm:text-lg">{title}</h1>
          <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
            {subtitle ?? (profile ? `${displayName} — ${roleLabel}` : '')}
          </p>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="btn-ghost touch-target px-3 text-sm lg:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="القائمة"
          >
            القائمة
          </button>
          <div className="min-w-0">
            <p className="font-display truncate text-sm font-bold text-primary-dark sm:text-base">
              {PLATFORM_SHORT_NAME}
            </p>
            <p className="truncate text-xs text-text-secondary">{PLATFORM_NAME}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Avatar name={displayName} size="sm" />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-secondary">{roleLabel}</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="btn-secondary text-sm">
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            aria-label="إغلاق القائمة"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-border bg-white pt-[7.5rem] transition-transform lg:static lg:z-0 lg:w-56 lg:shrink-0 lg:translate-x-0 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-primary-dark">القائمة</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-light text-primary-dark'
                      : 'text-text-secondary hover:bg-bg-page hover:text-text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l bg-primary-dark" />
                    )}
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          <PageMotion key={location.pathname}>{children ?? <Outlet />}</PageMotion>
        </main>
      </div>
      <CreditFooter />
    </div>
  )
}
