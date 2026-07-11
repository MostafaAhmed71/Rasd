import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { AbsenceRequest, Program } from '../../types/database'
import { ABSENCE_STATUS_LABELS, APOLOGY_TYPE_LABELS, LECTURE_MODE_LABELS } from '../../types/database'

export function CoordinatorAbsencePage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<AbsenceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const { data: programs } = await supabase
      .from('programs')
      .select('id')
      .eq('coordinator_id', profile.id)

    const programIds = ((programs as Program[]) ?? []).map((p) => p.id)
    if (programIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    const { data: sections } = await supabase
      .from('sections')
      .select('instructor_id')
      .in('program_id', programIds)

    const instructorIds = [
      ...new Set(
        ((sections as { instructor_id: string | null }[]) ?? [])
          .map((s) => s.instructor_id)
          .filter(Boolean),
      ),
    ] as string[]

    if (instructorIds.length === 0) {
      setRequests([])
      setLoading(false)
      return
    }

    const { data, error: err } = await supabase
      .from('absence_requests')
      .select('*, absence_request_lectures(*), profiles(full_name)')
      .in('instructor_id', instructorIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else setRequests((data as AbsenceRequest[]) ?? [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const review = async (id: string, status: 'approved' | 'rejected') => {
    const { error: err } = await supabase
      .from('absence_requests')
      .update({
        status,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (err) setError(err.message)
    else {
      setMessage(status === 'approved' ? 'تم القبول' : 'تم الرفض')
      void load()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">طلبات الاعتذار</h2>
        <p className="mt-1 text-sm text-text-secondary">طلبات قيد المراجعة لأعضاء البرنامج</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : requests.length === 0 ? (
        <div className="panel p-8 text-center text-text-secondary">لا توجد طلبات معلّقة.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const lec = req.absence_request_lectures?.[0]
            return (
              <article key={req.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-primary-dark">
                    {req.profiles?.full_name ?? 'عضو تدريس'}
                  </h3>
                  <StatusBadge label={ABSENCE_STATUS_LABELS[req.status]} tone="warning" />
                </div>
                {lec && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {lec.course_name} · شعبة {lec.section_number ?? '—'} · {lec.lecture_date}{' '}
                    {lec.lecture_time} · {LECTURE_MODE_LABELS[lec.lecture_mode]} ·{' '}
                    {APOLOGY_TYPE_LABELS[lec.apology_type]}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={() => void review(req.id, 'approved')}
                  >
                    قبول
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-sm"
                    onClick={() => void review(req.id, 'rejected')}
                  >
                    رفض
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
