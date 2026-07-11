import { useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { getInstructorNameFromSections } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type { AbsenceRequest, AbsenceStatus, Section } from '../../types/database'
import {
  ABSENCE_STATUS_LABELS,
  APOLOGY_TYPE_LABELS,
  LECTURE_MODE_LABELS,
} from '../../types/database'

interface AdminAbsencePanelProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void
}

export function AdminAbsencePanel({ onMessage }: AdminAbsencePanelProps) {
  const [requests, setRequests] = useState<AbsenceRequest[]>([])
  const [instructorNames, setInstructorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AbsenceStatus | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const loadRequests = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)

    let query = supabase
      .from('absence_requests')
      .select('*, profiles!instructor_id(full_name), absence_request_lectures(*)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const [{ data, error }, sectionsRes] = await Promise.all([
      query,
      supabase.from('sections').select('instructor_id, instructor_name'),
    ])

    if (error) {
      onMessageRef.current({ type: 'error', text: error.message })
      setLoading(false)
      return
    }

    const list = (data as AbsenceRequest[]) ?? []
    setRequests(list)

    const names: Record<string, string> = {}
    const sections = (sectionsRes.data as Pick<Section, 'instructor_id' | 'instructor_name'>[]) ?? []
    const byInstructor = new Map<string, Section[]>()
    for (const sec of sections) {
      if (!sec.instructor_id) continue
      const arr = byInstructor.get(sec.instructor_id) ?? []
      arr.push(sec as Section)
      byInstructor.set(sec.instructor_id, arr)
    }
    for (const req of list) {
      const secs = byInstructor.get(req.instructor_id) ?? []
      names[req.instructor_id] = getInstructorNameFromSections(
        secs,
        req.profiles?.full_name,
      )
    }
    setInstructorNames(names)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useRefreshOnFocus(() => loadRequests({ silent: true }))

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    setBusyId(requestId)

    const note = notes[requestId]?.trim() || null
    const { data: sessionData } = await supabase.auth.getSession()
    const adminId = sessionData.session?.user?.id

    const { error } = await supabase
      .from('absence_requests')
      .update({
        status,
        admin_note: note,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      onMessage({ type: 'error', text: error.message })
      setBusyId(null)
      return
    }

    // تحديث فوري في الواجهة دون انتظار إعادة التحميل
    setRequests((prev) => {
      if (filter !== 'all' && filter !== status) {
        return prev.filter((r) => r.id !== requestId)
      }
      return prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status,
              admin_note: note,
              reviewed_by: adminId ?? null,
              reviewed_at: new Date().toISOString(),
            }
          : r,
      )
    })
    setNotes((prev) => {
      const next = { ...prev }
      delete next[requestId]
      return next
    })
    onMessage({
      type: 'success',
      text: status === 'approved' ? 'تم قبول الطلب.' : 'تم رفض الطلب.',
    })
    await loadRequests({ silent: true })
    setBusyId(null)
  }

  return (
    <div className="panel p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-bold text-green">طلبات الاعتذار عن المحاضرة</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AbsenceStatus | 'all')}
          className="field-input sm:w-auto"
        >
          <option value="all">الكل</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {loading ? (
        <p className="text-green/70">جاري التحميل...</p>
      ) : requests.length === 0 ? (
        <p className="text-green/70">لا توجد طلبات.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <article
              key={req.id}
              className="animate-fade-up rounded-xl border border-green/10 bg-green-soft/25 p-4"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-green">
                    {instructorNames[req.instructor_id] ??
                      req.profiles?.full_name ??
                      'عضو تدريس'}
                  </p>
                  <p className="text-sm text-green/70">{req.college}</p>
                  <p className="mt-1 text-xs text-green/60">
                    {new Date(req.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    req.status === 'approved'
                      ? 'bg-green/10 text-green'
                      : req.status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {ABSENCE_STATUS_LABELS[req.status]}
                </span>
              </div>

              <ul className="mb-4 space-y-2 text-sm">
                {(req.absence_request_lectures ?? [])
                  .sort((a, b) => a.row_order - b.row_order)
                  .map((lec) => (
                    <li key={lec.id} className="rounded bg-white p-3">
                      <p className="font-medium">{lec.course_name}</p>
                      <p className="mt-1 text-green/70">
                        {lec.lecture_date} — {lec.lecture_time} —{' '}
                        {LECTURE_MODE_LABELS[lec.lecture_mode]} —{' '}
                        {APOLOGY_TYPE_LABELS[lec.apology_type]}
                      </p>
                    </li>
                  ))}
              </ul>

              {req.status === 'pending' ? (
                <div className="space-y-3 border-t border-green/10 pt-3">
                  <label className="block text-sm text-green">
                    ملاحظة (اختياري)
                    <textarea
                      value={notes[req.id] ?? ''}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      rows={2}
                      className="field-input mt-1 text-sm"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(req.id, 'approved')}
                      disabled={busyId === req.id}
                      className="btn-primary"
                    >
                      {busyId === req.id ? '...' : 'قبول'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(req.id, 'rejected')}
                      disabled={busyId === req.id}
                      className="btn-ghost btn-danger"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ) : (
                req.admin_note && (
                  <p className="rounded bg-white p-3 text-sm text-green/80">
                    <strong>ملاحظة:</strong> {req.admin_note}
                  </p>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
