import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_NAME, PLATFORM_TAGLINE } from '../lib/brand'
import { getInstructorNameFromSections } from '../lib/sections'
import { supabase } from '../lib/supabase'
import type { Section } from '../types/database'

interface LayoutProps {
  title: string
  children: ReactNode
}

export function Layout({ title, children }: LayoutProps) {
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
        <div className="mx-auto max-w-7xl px-3 py-3.5 sm:px-6 sm:py-4">
          <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-butter/70 sm:text-xs">
            {PLATFORM_TAGLINE}
          </p>

          <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-base font-bold sm:text-xl">
                {PLATFORM_NAME}
              </h1>
              <p className="mt-0.5 truncate text-xs text-butter/80 sm:text-sm">
                {title}
                {profile && displayName && (
                  <>
                    <span className="mx-1.5 opacity-50">·</span>
                    {displayName}
                    <span className="mx-1.5 opacity-50">·</span>
                    {profile.role === 'admin' ? 'مسؤول النظام' : 'عضو هيئة تدريس'}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="touch-target shrink-0 rounded-xl border border-butter/25 bg-butter/10 px-3 py-2 text-xs font-semibold transition hover:bg-butter/20 active:scale-95 sm:px-4 sm:text-sm"
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
