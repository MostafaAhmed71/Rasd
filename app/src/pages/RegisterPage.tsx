import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RegisterPage() {
  const { signUp, user, profile, loading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/instructor'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
      return
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقين.')
      return
    }

    setSubmitting(true)
    const result = await signUp(email.trim(), password, fullName.trim())

    if (result.error) {
      setError(result.error)
    } else if (result.needsConfirmation) {
      setSuccess('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب ثم سجّل الدخول.')
    } else {
      setSuccess('تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.')
    }

    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-butter p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
        <div className="bg-green px-6 py-8 text-center text-butter">
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="mt-2 text-sm opacity-80">لأعضاء التدريس</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 sm:p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-green/10 px-4 py-3 text-sm text-green">{success}</div>
          )}

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-green">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="touch-target w-full rounded-lg border border-green/20 bg-butter/30 px-4 py-3 text-green outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              placeholder="د. أحمد محمد"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="touch-target w-full rounded-lg border border-green/20 bg-butter/30 px-4 py-3 text-green outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-green">
              تأكيد كلمة المرور
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="touch-target w-full rounded-lg border border-green/20 bg-butter/30 px-4 py-3 text-green outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="touch-target w-full rounded-lg bg-green py-3 font-bold text-butter transition hover:bg-green-light disabled:opacity-60"
          >
            {submitting ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>

          <p className="text-center text-sm text-green/70">
            لديك حساب؟{' '}
            <Link to="/login" className="font-medium text-green underline hover:text-green-light">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
