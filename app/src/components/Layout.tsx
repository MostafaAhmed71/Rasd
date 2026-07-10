import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen min-h-dvh bg-butter">
      <header className="sticky top-0 z-20 bg-green text-butter shadow-md">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-3 py-3 sm:items-center sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold sm:text-xl">{title}</h1>
            {profile && (
              <p className="truncate text-xs opacity-80 sm:text-sm">
                {profile.full_name} — {profile.role === 'admin' ? 'مسؤول النظام' : 'عضو تدريس'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="touch-target shrink-0 rounded-lg border border-butter/30 bg-butter/10 px-3 py-2 text-xs font-medium transition hover:bg-butter/20 sm:px-4 sm:text-sm"
          >
            خروج
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  )
}
