import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../../components/Alert'
import { AdminDocumentsPanel } from '../admin/AdminDocumentsPanel'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Profile, Program, Section } from '../../types/database'

export function CoordinatorDocumentsPage() {
  const { profile } = useAuth()
  const [instructors, setInstructors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const { data: programs } = await supabase
      .from('programs')
      .select('id')
      .eq('coordinator_id', profile.id)

    const programIds = ((programs as Program[]) ?? []).map((p) => p.id)
    if (!programIds.length) {
      setInstructors([])
      setLoading(false)
      return
    }

    const { data: sections } = await supabase
      .from('sections')
      .select('instructor_id')
      .in('program_id', programIds)

    const ids = [
      ...new Set(
        ((sections as Pick<Section, 'instructor_id'>[]) ?? [])
          .map((s) => s.instructor_id)
          .filter(Boolean),
      ),
    ] as string[]

    if (!ids.length) {
      setInstructors([])
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .order('full_name')

    if (err) setError(err.message)
    else setInstructors((data as Profile[]) ?? [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  const onMessage = useMemo(
    () => (msg: { type: 'success' | 'error'; text: string }) => setMessage(msg),
    [],
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">جداول البرنامج</h2>
        <p className="mt-1 text-sm text-text-secondary">
          رفع وتعديل جداول المراقبة وجدول عضو هيئة التدريس لأعضاء برنامجك فقط
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : instructors.length === 0 ? (
        <div className="panel p-8 text-center text-text-secondary">
          لا يوجد أعضاء مرتبطون ببرنامجك لرفع جداولهم.
        </div>
      ) : (
        <AdminDocumentsPanel instructors={instructors} onMessage={onMessage} />
      )}
    </div>
  )
}
