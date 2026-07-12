import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/Alert'
import { KpiCard } from '../../components/ui/KpiCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { Program } from '../../types/database'

interface ProgramRow {
  program: Program
  memberCount: number
  progress: number
}

export function ExecutiveOverviewPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [instructorCount, setInstructorCount] = useState(0)
  const [weeklyAbsence, setWeeklyAbsence] = useState(0)
  const [avgProgress, setAvgProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [programsRes, instructorsRes, sectionsRes, studentsRes, absenceRes] = await Promise.all([
      supabase.from('programs').select('*, profiles:coordinator_id(full_name)').order('name'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'instructor'),
      supabase.from('sections').select('id, program_id, instructor_id'),
      supabase.from('students').select('id, section_id, grades(student_id)'),
      supabase
        .from('absence_requests')
        .select('id', { count: 'exact' })
        .gte('created_at', weekAgo.toISOString()),
    ])

    if (programsRes.error) {
      setError(programsRes.error.message)
      setLoading(false)
      return
    }

    const sections = sectionsRes.data ?? []
    const students = studentsRes.data ?? []
    const list = ((programsRes.data as Program[]) ?? []).map((program) => {
      const progSections = sections.filter((s) => s.program_id === program.id)
      const memberIds = new Set(
        progSections.map((s) => s.instructor_id).filter(Boolean) as string[],
      )
      let total = 0
      let graded = 0
      for (const sec of progSections) {
        const ss = students.filter((st) => st.section_id === sec.id)
        total += ss.length
        graded += ss.filter((st) => {
          const g = Array.isArray(st.grades) ? st.grades[0] : st.grades
          return g != null
        }).length
      }
      return {
        program,
        memberCount: memberIds.size,
        progress: total > 0 ? Math.round((graded / total) * 100) : 0,
      }
    })

    setPrograms(list)
    setInstructorCount(instructorsRes.count ?? instructorsRes.data?.length ?? 0)
    setWeeklyAbsence(absenceRes.count ?? 0)
    setAvgProgress(
      list.length ? Math.round(list.reduce((a, p) => a + p.progress, 0) / list.length) : 0,
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-primary-dark">نظرة عامة على الكلية</h2>
          <p className="mt-1 text-sm text-text-secondary">ملخص البرامج والإنجاز وطلبات الاعتذار</p>
        </div>
        <Link to="/executive/programs" className="btn-secondary text-sm">
          كل البرامج وتعيين المنسقين
        </Link>
        <Link to="/executive/absence-stats" className="btn-secondary text-sm">
          إحصائيات الاعتذار
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي البرامج" value={programs.length} />
        <KpiCard label="إجمالي الأعضاء" value={instructorCount} />
        <KpiCard
          label="متوسط الإنجاز الكلي"
          value={`${avgProgress}%`}
          hint="أفضل من الفصل الماضي"
        />
        <KpiCard label="طلبات اعتذار هذا الأسبوع" value={weeklyAbsence} />
      </div>

      {loading ? (
        <div className="skeleton h-48 w-full" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>البرنامج</th>
                <th>عدد الأعضاء</th>
                <th>نسبة إنجاز الرصد</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((row) => (
                <tr key={row.program.id}>
                  <td className="font-semibold">{row.program.name}</td>
                  <td>{row.memberCount}</td>
                  <td className="min-w-[12rem]">
                    <ProgressBar value={row.progress} showLabel={false} />
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-text-secondary">
                    لا توجد برامج بعد. أنشئ برامجاً من صفحة البرامج والمنسقين.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
