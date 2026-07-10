import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { useAuth } from '../contexts/AuthContext'
import { PLATFORM_COLLEGE, PLATFORM_NAME, PLATFORM_ORG } from '../lib/brand'

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
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/instructor/grades'} replace />
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
    <div className="app-shell flex min-h-screen min-h-dvh items-center justify-center p-4">
      <div className="auth-card">
        <div className="auth-header">
          <p className="relative z-10 text-xs font-medium text-butter/70">{PLATFORM_ORG}</p>
          <h1 className="font-display relative z-10 mt-2 text-2xl font-bold">{PLATFORM_NAME}</h1>
          <p className="relative z-10 mt-3 text-sm text-butter/80">{PLATFORM_COLLEGE}</p>
          <p className="relative z-10 mt-2 text-sm text-butter/70">إنشاء حساب جديد</p>
        </div>

        <form onSubmit={handleSubmit} className="animate-fade-up space-y-4 p-5 sm:p-6">
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-green">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field-input"
              placeholder="د. أحمد محمد"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-green">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="example@university.edu"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-green">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-green">
              تأكيد كلمة المرور
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="field-input"
              dir="ltr"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>

          <p className="text-center text-sm text-green/70">
            لديك حساب؟{' '}
            <Link
              to="/login"
              className="font-semibold text-green underline decoration-green/30 underline-offset-4 transition hover:decoration-green"
            >
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
