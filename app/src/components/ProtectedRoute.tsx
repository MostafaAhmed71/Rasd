import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { homePathForRole } from '../lib/roles'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

function roleAllowed(role: UserRole, allowed: UserRole[]): boolean {
  if (allowed.includes(role)) return true
  // legacy admin maps to executive
  if (role === 'admin' && allowed.includes('executive_director')) return true
  if (role === 'executive_director' && allowed.includes('admin')) return true
  return false
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen min-h-dvh items-center justify-center">
        <div className="animate-fade-up text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary-dark" />
          <p className="text-lg font-medium text-primary-dark">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center bg-bg-page p-4 sm:p-6">
        <div className="max-w-md rounded-2xl bg-primary-dark p-6 text-center text-white">
          <h2 className="mb-2 text-xl font-bold">لم يتم العثور على الملف الشخصي</h2>
          <p className="text-sm opacity-90">
            تأكد من تشغيل سكربت قاعدة البيانات في Supabase وإنشاء حسابك في جدول profiles.
          </p>
        </div>
      </div>
    )
  }

  if (allowedRoles && !roleAllowed(profile.role, allowedRoles)) {
    return <Navigate to={homePathForRole(profile.role)} replace />
  }

  return <Outlet />
}
