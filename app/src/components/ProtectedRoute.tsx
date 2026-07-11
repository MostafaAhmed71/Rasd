import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen min-h-dvh items-center justify-center">
        <div className="animate-fade-up text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-green/20 border-t-green animate-spin" />
          <p className="text-lg font-medium text-green">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center bg-butter p-4 sm:p-6">
        <div className="max-w-md rounded-2xl bg-green p-6 text-center text-butter">
          <h2 className="mb-2 text-xl font-bold">لم يتم العثور على الملف الشخصي</h2>
          <p className="text-sm opacity-90">
            تأكد من تشغيل سكربت قاعدة البيانات في Supabase وإنشاء حسابك في جدول profiles.
          </p>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const redirect = profile.role === 'admin' ? '/admin' : '/instructor/courses'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
