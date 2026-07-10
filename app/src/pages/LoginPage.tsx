import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn, user, profile, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/instructor'} replace />
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
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-butter p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
        <div className="bg-green px-6 py-8 text-center text-butter">
          <h1 className="text-2xl font-bold">نظام رصد درجات التدريب الميداني</h1>
          <p className="mt-2 text-sm opacity-80">سجّل دخولك للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 sm:p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-green">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="touch-target w-full rounded-lg border border-green/20 bg-butter/30 px-4 py-3 text-green outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              placeholder="example@university.edu"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-green">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="touch-target w-full rounded-lg border border-green/20 bg-butter/30 px-4 py-3 text-green outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="touch-target w-full rounded-lg bg-green py-3 font-bold text-butter transition hover:bg-green-light disabled:opacity-60"
          >
            {submitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>

          <p className="text-center text-sm text-green/70">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="font-medium text-green underline hover:text-green-light">
              إنشاء حساب
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
