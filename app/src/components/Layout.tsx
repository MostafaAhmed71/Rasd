import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/brand'
import { getInstructorNameFromSections } from '../lib/sections'
import { supabase } from '../lib/supabase'
import type { Section } from '../types/database'

interface LayoutProps {
  title: string
  subtitle?: string
  sidebar?: ReactNode
  children: ReactNode
}

function getInitials(name: string | null) {
  if (!name) return '؟'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

export function Layout({ title, subtitle, sidebar, children }: LayoutProps) {
  const { profile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    async function loadDisplayName() {
      if (!profile) {
        setDisplayName(null)
        return
      }

      if (profile.role === 'admin') {
        setDisplayName(profile.full_name)
        return
      }

      const { data } = await supabase
        .from('sections')
        .select('instructor_name')
        .eq('instructor_id', profile.id)

      const name = getInstructorNameFromSections(
        (data as Section[]) ?? [],
        profile.full_name,
      )
      setDisplayName(name)
    }

    void loadDisplayName()
  }, [profile])

  return (
    <div className="app-shell">
      <header className="page-header-bar animate-slide-down">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="font-display truncate text-lg font-bold sm:text-xl">{title}</h1>
            <p className="mt-1 truncate text-xs text-white/80 sm:text-sm">
              {subtitle || PLATFORM_TAGLINE}
            </p>
          </div>
        </div>
      </header>

      <div className="app-header animate-fade-in">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="avatar-circle">{PLATFORM_NAME.slice(0, 1)}</div>
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-bold text-green">{PLATFORM_NAME}</p>
              <p className="truncate text-xs text-text-secondary">{PLATFORM_TAGLINE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="avatar-circle">{getInitials(displayName || profile?.full_name || null)}</div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-green">{displayName ?? profile?.full_name ?? '—'}</p>
              <p className="text-xs text-text-secondary">
                {profile?.role === 'instructor' ? 'عضو هيئة تدريس' : 'حساب إداري'}
              </p>
            </div>
            <button type="button" onClick={() => signOut()} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-7">
        <div className="layout-grid">
          {sidebar && <aside className="sidebar-card animate-fade-up">{sidebar}</aside>}
          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}
