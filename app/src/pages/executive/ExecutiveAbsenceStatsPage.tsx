import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../../components/Alert'
import { KpiCard } from '../../components/ui/KpiCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { AbsenceRequest, AbsenceStatus } from '../../types/database'
import { ABSENCE_STATUS_LABELS, APOLOGY_TYPE_LABELS, LECTURE_MODE_LABELS } from '../../types/database'

export function ExecutiveAbsenceStatsPage() {
  const [requests, setRequests] = useState<AbsenceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AbsenceStatus | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('absence_requests')
      .select('*, profiles!instructor_id(full_name), absence_request_lectures(*)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setRequests((data as AbsenceRequest[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length
    const approved = requests.filter((r) => r.status === 'approved').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    return { total: requests.length, pending, approved, rejected }
  }, [requests])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">
          إحصائيات طلبات الاعتذار
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          عرض إحصائي فقط — القبول والرفض من صلاحية منسق البرنامج
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي الطلبات" value={stats.total} />
        <KpiCard label="قيد المراجعة" value={stats.pending} />
        <KpiCard label="مقبولة" value={stats.approved} />
        <KpiCard label="مرفوضة" value={stats.rejected} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
            onClick={() => setFilter(key)}
          >
            {key === 'all' ? 'الكل' : ABSENCE_STATUS_LABELS[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : requests.length === 0 ? (
        <div className="panel p-8 text-center text-text-secondary">لا توجد طلبات.</div>
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
                  <StatusBadge
                    label={ABSENCE_STATUS_LABELS[req.status]}
                    tone={
                      req.status === 'approved'
                        ? 'success'
                        : req.status === 'pending'
                          ? 'warning'
                          : 'neutral'
                    }
                  />
                </div>
                {lec && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {lec.course_name} · شعبة {lec.section_number ?? '—'} · {lec.lecture_date}{' '}
                    {lec.lecture_time} · {LECTURE_MODE_LABELS[lec.lecture_mode]} ·{' '}
                    {APOLOGY_TYPE_LABELS[lec.apology_type]}
                  </p>
                )}
                <p className="mt-1 text-xs text-text-secondary">
                  تاريخ الطلب: {new Date(req.created_at).toLocaleString('ar-SA')}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
