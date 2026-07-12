import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/Alert'
import { KpiCard } from '../../components/ui/KpiCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { downloadBlob, exportGradesToExcel } from '../../lib/exportExcel'
import { getSectionInstructorName } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type { Program, Section, StudentWithGrade } from '../../types/database'

interface ProgramRow {
  section: Section
  instructorName: string
  total: number
  graded: number
}

export function CoordinatorReportsPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ProgramRow[]>([])
  const [programName, setProgramName] = useState('')
  const [pendingAbsences, setPendingAbsences] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const { data: programs } = await supabase
      .from('programs')
      .select('*')
      .eq('coordinator_id', profile.id)
      .limit(1)

    const prog = (programs as Program[])?.[0]
    if (!prog) {
      setRows([])
      setProgramName('')
      setLoading(false)
      return
    }
    setProgramName(prog.name)

    const [{ data: sections }, { data: students }, { count }] = await Promise.all([
      supabase
        .from('sections')
        .select('*, profiles!instructor_id(full_name)')
        .eq('program_id', prog.id)
        .order('section_number'),
      supabase.from('students').select('id, section_id, grades(student_id)'),
      supabase
        .from('absence_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    const sectionList = (sections as Section[]) ?? []
    const studentList = students ?? []
    const mapped = sectionList.map((section) => {
      const ss = studentList.filter((s) => s.section_id === section.id)
      const graded = ss.filter((s) => {
        const g = Array.isArray(s.grades) ? s.grades[0] : s.grades
        return g != null
      }).length
      return {
        section,
        instructorName: getSectionInstructorName(section),
        total: ss.length,
        graded,
      }
    })

    setRows(mapped)
    setPendingAbsences(count ?? 0)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const avg =
    rows.length === 0
      ? 0
      : Math.round(
          rows.reduce((a, r) => a + (r.total ? (r.graded / r.total) * 100 : 0), 0) / rows.length,
        )

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)
    setError(null)
    try {
      const exportData = []
      for (const row of rows) {
        const { data: students, error: stErr } = await supabase
          .from('students')
          .select('*, grades(*)')
          .eq('section_id', row.section.id)
          .order('university_id')
        if (stErr) throw stErr
        exportData.push({
          section: row.section,
          instructorName: row.instructorName,
          students: (students ?? []).map((s) => ({
            ...(s as StudentWithGrade),
            grades: Array.isArray(s.grades) ? s.grades[0] ?? null : s.grades,
          })),
        })
      }
      const blob = await exportGradesToExcel(exportData)
      downloadBlob(blob, `تقرير-برنامج-${programName || 'برنامج'}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setMessage('تم تصدير تقرير البرنامج بنجاح')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التصدير')
    }
    setExporting(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-primary-dark">تقارير البرنامج</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {programName ? `برنامج ${programName}` : 'ملخص إنجاز الرصد لبرنامجك'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={exporting || rows.length === 0}
          onClick={() => void handleExport()}
        >
          {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="عدد الشعب" value={rows.length} />
        <KpiCard label="متوسط إنجاز الرصد" value={`${avg}%`} />
        <KpiCard label="طلبات اعتذار معلّقة" value={pendingAbsences} />
      </div>

      <div className="flex gap-2">
        <Link to="/coordinator/grades" className="btn-secondary text-sm">
          رصد / تعديل الدرجات
        </Link>
        <Link to="/coordinator/absence" className="btn-secondary text-sm">
          طلبات الاعتذار
        </Link>
      </div>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>المقرر</th>
                <th>الشعبة</th>
                <th>عضو التدريس</th>
                <th>الإنجاز</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = row.total ? Math.round((row.graded / row.total) * 100) : 0
                return (
                  <tr key={row.section.id}>
                    <td>{row.section.course_title ?? '—'}</td>
                    <td>{row.section.section_number}</td>
                    <td>{row.instructorName}</td>
                    <td className="min-w-[10rem]">
                      <ProgressBar value={pct} showLabel={false} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-secondary">
                    لا توجد بيانات برنامج بعد.
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
