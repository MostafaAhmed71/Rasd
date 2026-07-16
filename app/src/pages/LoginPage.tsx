import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_COLLEGE, PLATFORM_NAME, PLATFORM_ORG } from '../lib/brand'
import { homePathForRole } from '../lib/roles'
import { CreditFooter } from '../components/CreditFooter'

export function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
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

  return (
    <div className="login-shell">
      <div className="w-full max-w-md">
        <div className="auth-card">
          <div className="auth-header">
            <p className="relative z-10 text-xs font-medium text-white/70">{PLATFORM_ORG}</p>
            <h1 className="font-display relative z-10 mt-2 text-2xl font-bold leading-snug">
              {PLATFORM_NAME}
            </h1>
            <p className="relative z-10 mt-3 text-sm text-white/80">{PLATFORM_COLLEGE}</p>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="animate-fade-up space-y-4 p-5 sm:p-6"
          >
            {error && <Alert type="error">{error}</Alert>}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-primary-dark"
              >
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
        <CreditFooter variant="auth" />
      </div>
    </div>
  )
}
