import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_COLLEGE, PLATFORM_NAME, PLATFORM_ORG } from '../lib/brand'
import { homePathForRole, ROLE_LABELS } from '../lib/roles'
import { TrialBanner } from '../components/TrialBanner'

const DEMO_MODE = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true'

const DEMO_ACCOUNTS = [
  {
    label: 'د. خلف الشمري',
    role: 'executive_director' as const,
    email: 'Maha01@g.com',
    password: '123456789',
  },
  {
    label: 'مها العنزي',
    role: 'program_coordinator' as const,
    email: 'Maha02@g.com',
    password: '123456789',
  },
  {
    label: 'د. مها عياد',
    role: 'instructor' as const,
    email: 'Maha03@g.com',
    password: '123456789',
  },
]

export function LoginPage() {
  const { signIn, signOut, user, profile, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && profile) {
    return <Navigate to={homePathForRole(profile.role)} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  const handleDemo = async (demoEmail: string, demoPassword: string) => {
    setError(null)
    setSubmitting(true)
    setEmail(demoEmail)
    setPassword(demoPassword)
    await signOut()
    const result = await signIn(demoEmail, demoPassword)
    if (result.error) {
      setError(
        `${result.error} — أنشئ الحسابات التجريبية في Supabase Auth أولاً إن لم تكن موجودة.`,
      )
    }
    setSubmitting(false)
  }

  return (
    <div className="login-shell">
      <div className="w-full max-w-md">
        <TrialBanner compact />
        <div className="auth-card">
        <div className="auth-header">
          <p className="relative z-10 text-xs font-medium text-white/70">{PLATFORM_ORG}</p>
          <h1 className="font-display relative z-10 mt-2 text-2xl font-bold leading-snug">
            {PLATFORM_NAME}
          </h1>
          <p className="relative z-10 mt-3 text-sm text-white/80">{PLATFORM_COLLEGE}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="animate-fade-up space-y-4 p-5 sm:p-6">
          {error && <Alert type="error">{error}</Alert>}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-primary-dark">
              اسم المستخدم / البريد
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="khalaf.fadid@university.edu"
              dir="ltr"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-primary-dark"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              dir="ltr"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>

          {DEMO_MODE && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-center text-xs text-text-secondary">
                أو اختر حساباً تجريبياً للمعاينة
              </p>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleDemo(acc.email, acc.password)}
                  className="btn-secondary flex w-full items-center gap-3 text-right"
                >
                  <Avatar name={acc.label} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{acc.label}</span>
                    <span className="block text-xs text-text-secondary">
                      {ROLE_LABELS[acc.role]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-sm text-text-secondary">
            ليس لديك حساب؟{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-dark underline decoration-primary/30 underline-offset-4"
            >
              إنشاء حساب
            </Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  )
}
