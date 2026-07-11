import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../../components/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { KpiCard } from '../../components/ui/KpiCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { AbsenceRequest, Program, Section } from '../../types/database'
import { ABSENCE_STATUS_LABELS, APOLOGY_TYPE_LABELS, LECTURE_MODE_LABELS } from '../../types/database'

interface MemberCard {
  instructorId: string
  name: string
  sections: Section[]
  progress: number
  pendingRequests: AbsenceRequest[]
}

export function CoordinatorMembersPage() {
  const { profile } = useAuth()
  const [program, setProgram] = useState<Program | null>(null)
  const [members, setMembers] = useState<MemberCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const { data: programs, error: pErr } = await supabase
      .from('programs')
      .select('*')
      .eq('coordinator_id', profile.id)
      .limit(1)

    if (pErr) {
      setError(pErr.message)
      setLoading(false)
      return
    }

    const prog = (programs?.[0] as Program) ?? null
    setProgram(prog)
    if (!prog) {
      setMembers([])
      setLoading(false)
      return
    }

    const { data: sections } = await supabase
      .from('sections')
      .select('*, profiles(full_name)')
      .eq('program_id', prog.id)

    const sectionList = (sections as Section[]) ?? []
    const instructorIds = [
      ...new Set(sectionList.map((s) => s.instructor_id).filter(Boolean)),
    ] as string[]

    const [studentsRes, absenceRes] = await Promise.all([
      supabase.from('students').select('id, section_id, grades(student_id)'),
      instructorIds.length
        ? supabase
            .from('absence_requests')
            .select('*, absence_request_lectures(*), profiles(full_name)')
            .in('instructor_id', instructorIds)
            .eq('status', 'pending')
        : Promise.resolve({ data: [] as AbsenceRequest[] }),
    ])

    const students = studentsRes.data ?? []
    const absences = (absenceRes.data as AbsenceRequest[]) ?? []

    const cards: MemberCard[] = instructorIds.map((id) => {
      const instructorSections = sectionList.filter((s) => s.instructor_id === id)
      const name =
        instructorSections[0]?.instructor_name ||
        instructorSections[0]?.profiles?.full_name ||
        'عضو تدريس'
      let total = 0
      let graded = 0
      for (const sec of instructorSections) {
        const ss = students.filter((s) => s.section_id === sec.id)
        total += ss.length
        graded += ss.filter((s) => {
          const g = Array.isArray(s.grades) ? s.grades[0] : s.grades
          return g != null
        }).length
      }
      return {
        instructorId: id,
        name,
        sections: instructorSections,
        progress: total > 0 ? Math.round((graded / total) * 100) : 0,
        pendingRequests: absences.filter((a) => a.instructor_id === id),
      }
    })

    setMembers(cards)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const avgProgress = useMemo(() => {
    if (members.length === 0) return 0
    return Math.round(members.reduce((a, m) => a + m.progress, 0) / members.length)
  }, [members])

  const pendingCount = useMemo(
    () => members.reduce((a, m) => a + m.pendingRequests.length, 0),
    [members],
  )

  const reviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setMessage(null)
    const { error: err } = await supabase
      .from('absence_requests')
      .update({
        status,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
    if (err) setError(err.message)
    else {
      setMessage(status === 'approved' ? 'تم قبول الطلب' : 'تم رفض الطلب')
      void load()
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">
          أعضاء برنامجي{program ? ` — ${program.name}` : ''}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">أعضاء البرنامج المسؤول عنه فقط</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="عدد الأعضاء" value={members.length} />
        <KpiCard label="متوسط إنجاز الرصد" value={`${avgProgress}%`} />
        <KpiCard label="طلبات اعتذار معلّقة" value={pendingCount} />
      </div>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : !program ? (
        <div className="panel p-8 text-center text-text-secondary">
          لم يُعيَّن لك برنامج بعد. تواصل مع المدير التنفيذي.
        </div>
      ) : members.length === 0 ? (
        <div className="panel p-8 text-center text-text-secondary">لا يوجد أعضاء في البرنامج.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((m) => (
            <article key={m.instructorId} className="panel p-5">
              <div className="flex items-start gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-primary-dark">{m.name}</h3>
                    <StatusBadge label="نشط" tone="success" />
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {m.sections.map((s) => s.course_title ?? `شعبة ${s.section_number}`).join(' · ')}
                  </p>
                  <div className="mt-3">
                    <ProgressBar value={m.progress} />
                  </div>
                </div>
              </div>

              {m.pendingRequests.map((req) => {
                const lec = req.absence_request_lectures?.[0]
                return (
                  <div
                    key={req.id}
                    className="mt-4 rounded-lg border border-warning-bg bg-warning-bg/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <StatusBadge label={ABSENCE_STATUS_LABELS[req.status]} tone="warning" />
                    </div>
                    {lec && (
                      <p className="text-sm text-text-primary">
                        {lec.course_name} · شعبة {lec.section_number} · {lec.lecture_date} ·{' '}
                        {LECTURE_MODE_LABELS[lec.lecture_mode]} ·{' '}
                        {APOLOGY_TYPE_LABELS[lec.apology_type]}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        onClick={() => void reviewRequest(req.id, 'approved')}
                      >
                        قبول
                      </button>
                      <button
                        type="button"
                        className="btn-danger text-sm"
                        onClick={() => void reviewRequest(req.id, 'rejected')}
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                )
              })}
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary">
        المنسق يرى أعضاء برنامجه فقط، ولا يظهر له أي عضو من برنامج آخر.
      </p>
    </div>
  )
}
