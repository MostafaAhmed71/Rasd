import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { ROLE_LABELS } from '../../lib/roles'
import { supabase } from '../../lib/supabase'
import {
  CREATABLE_ROLES,
  createUserAccount,
  isCreatableRole,
  updateUserName,
  updateUserRole,
  type CreatableRole,
} from '../../lib/users'
import type { Profile } from '../../types/database'

export function ExecutiveUsersPage() {
  const { profile: current } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<CreatableRole>('instructor')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
      return
    }

    setSaving(true)
    const result = await createUserAccount({
      email,
      password,
      fullName,
      role,
    })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setMessage(`تم إنشاء حساب «${fullName.trim()}» بنجاح.`)
    setFullName('')
    setEmail('')
    setPassword('')
    setRole('instructor')
    void load()
  }

  const handleRoleChange = async (userId: string, nextRole: CreatableRole) => {
    if (userId === current?.id && nextRole !== 'executive_director') {
      setError('لا يمكنك تخفيض دور حسابك الحالي وأنت مسجّل الدخول.')
      return
    }
    setError(null)
    setMessage(null)
    const { error: err } = await updateUserRole(userId, nextRole)
    if (err) setError(err)
    else {
      setMessage('تم تحديث الدور.')
      void load()
    }
  }

  const handleRename = async (userId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const { error: err } = await updateUserName(userId, trimmed)
    if (err) setError(err)
    else {
      setMessage('تم تحديث الاسم.')
      void load()
    }
  }

  const counts = {
    instructor: users.filter((u) => u.role === 'instructor').length,
    program_coordinator: users.filter((u) => u.role === 'program_coordinator').length,
    executive_director: users.filter(
      (u) => u.role === 'executive_director' || u.role === 'admin',
    ).length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">إدارة المستخدمين</h2>
        <p className="mt-1 text-sm text-text-secondary">
          إنشاء حسابات جديدة لجميع الأدوار وتعديل الأدوار والأسماء
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4 text-center">
          <p className="text-xs text-text-secondary">أعضاء التدريس</p>
          <p className="font-display mt-1 text-2xl font-bold text-primary-dark">
            {counts.instructor}
          </p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-xs text-text-secondary">منسقو البرامج</p>
          <p className="font-display mt-1 text-2xl font-bold text-primary-dark">
            {counts.program_coordinator}
          </p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-xs text-text-secondary">المديرون التنفيذيون</p>
          <p className="font-display mt-1 text-2xl font-bold text-primary-dark">
            {counts.executive_director}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="panel space-y-4 p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold text-primary-dark">إنشاء حساب جديد</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-text-primary">
            الاسم الكامل
            <input
              className="field-input mt-1"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="د. أحمد محمد"
            />
          </label>
          <label className="block text-sm font-medium text-text-primary">
            البريد الإلكتروني
            <input
              className="field-input mt-1"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@university.edu"
            />
          </label>
          <label className="block text-sm font-medium text-text-primary">
            كلمة المرور
            <input
              className="field-input mt-1"
              type="password"
              required
              minLength={6}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
            />
          </label>
          <label className="block text-sm font-medium text-text-primary">
            الدور
            <select
              className="field-input mt-1"
              value={role}
              onChange={(e) => setRole(e.target.value as CreatableRole)}
            >
              {CREATABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الدور</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-secondary">
                  جاري التحميل...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-secondary">
                  لا يوجد مستخدمون.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const roleValue: CreatableRole = isCreatableRole(user.role)
                  ? user.role
                  : user.role === 'admin'
                    ? 'executive_director'
                    : 'instructor'
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <input
                          className="field-input min-w-[12rem] py-1.5 text-sm"
                          defaultValue={user.full_name ?? ''}
                          key={`${user.id}-${user.full_name}`}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== (user.full_name ?? '')) {
                              void handleRename(user.id, e.target.value)
                            }
                          }}
                        />
                        {user.id === current?.id && (
                          <span className="w-fit">
                            <StatusBadge label="أنت" tone="success" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        className="field-input py-1.5 text-sm"
                        value={roleValue}
                        onChange={(e) =>
                          void handleRoleChange(user.id, e.target.value as CreatableRole)
                        }
                      >
                        {CREATABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-sm text-text-secondary">
                      {new Date(user.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="text-sm text-text-secondary">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
