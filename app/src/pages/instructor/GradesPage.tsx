import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { downloadBlob, exportSectionGradesToExcel } from '../../lib/exportExcel'
import { getSectionInstructorName } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type { GradeField, Section, StudentWithGrade } from '../../types/database'
import { GRADE_FIELDS } from '../../types/database'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function GradesPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [students, setStudents] = useState<StudentWithGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadSections = useCallback(async () => {
    setLoading(true)
    const { data, error: secError } = await supabase
      .from('sections')
      .select('*')
      .order('section_number')

    if (secError) {
      setError(secError.message)
    } else {
      const list = (data as Section[]) ?? []
      setSections(list)
      setSelectedSectionId((prev) =>
        prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? ''),
      )
    }
    setLoading(false)
  }, [])

  const loadStudents = useCallback(async (sectionId: string, opts?: { silent?: boolean }) => {
    if (!sectionId) return
    if (!opts?.silent) setLoadingStudents(true)
    setError(null)

    const { data, error: stError } = await supabase
      .from('students')
      .select('*, grades(*)')
      .eq('section_id', sectionId)
      .order('university_id')

    if (stError) {
      setError(stError.message)
      setStudents([])
    } else {
      setStudents(
        (data ?? []).map((row) => ({
          ...(row as StudentWithGrade),
          grades: Array.isArray(row.grades) ? row.grades[0] ?? null : row.grades,
        })),
      )
    }
    setLoadingStudents(false)
  }, [])

  useEffect(() => {
    void loadSections()
  }, [loadSections])

  useEffect(() => {
    if (selectedSectionId) void loadStudents(selectedSectionId)
  }, [selectedSectionId, loadStudents])

  useRefreshOnFocus(() => {
    void loadSections()
    if (selectedSectionId) void loadStudents(selectedSectionId, { silent: true })
  })

  const handleGradeChange = (studentId: string, field: GradeField, value: string) => {
    const num = value === '' ? null : Number(value)
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s
        const grades = s.grades ?? {
          student_id: studentId,
          field_supervisor_score: null,
          academic_supervisor_score: null,
          platform_course_1: null,
          platform_course_2: null,
          platform_course_3: null,
          platform_course_4: null,
          report_writing_score: null,
          report_discussion_score: null,
          total_score: null,
          updated_by: null,
          updated_at: '',
        }
        return { ...s, grades: { ...grades, [field]: num } }
      }),
    )
  }

  const handleGradeBlur = async (studentId: string, field: GradeField) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    const gradeData = student.grades
    const value = gradeData?.[field] ?? null
    const fieldDef = GRADE_FIELDS.find((f) => f.key === field)
    if (fieldDef && value !== null && (value < 0 || value > fieldDef.max)) {
      setSaveStatus((prev) => ({ ...prev, [`${studentId}-${field}`]: 'error' }))
      return
    }

    const key = `${studentId}-${field}`
    setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }))

    const payload = {
      student_id: studentId,
      field_supervisor_score: gradeData?.field_supervisor_score ?? null,
      academic_supervisor_score: gradeData?.academic_supervisor_score ?? null,
      platform_course_1: gradeData?.platform_course_1 ?? null,
      platform_course_2: gradeData?.platform_course_2 ?? null,
      platform_course_3: gradeData?.platform_course_3 ?? null,
      platform_course_4: gradeData?.platform_course_4 ?? null,
      report_writing_score: gradeData?.report_writing_score ?? null,
      report_discussion_score: gradeData?.report_discussion_score ?? null,
    }

    const { data, error: saveError } = await supabase
      .from('grades')
      .upsert(payload, { onConflict: 'student_id' })
      .select()
      .single()

    if (saveError) {
      setSaveStatus((prev) => ({ ...prev, [key]: 'error' }))
      return
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, grades: data } : s)),
    )
    setSaveStatus((prev) => ({ ...prev, [key]: 'saved' }))
    setTimeout(() => {
      setSaveStatus((prev) => ({ ...prev, [key]: 'idle' }))
    }, 2000)
  }

  const calcTotal = (student: StudentWithGrade) => {
    const g = student.grades
    if (!g) return '—'
    if (g.total_score != null) return g.total_score
    const sum =
      (g.field_supervisor_score ?? 0) +
      (g.academic_supervisor_score ?? 0) +
      (g.platform_course_1 ?? 0) +
      (g.platform_course_2 ?? 0) +
      (g.platform_course_3 ?? 0) +
      (g.platform_course_4 ?? 0) +
      (g.report_writing_score ?? 0) +
      (g.report_discussion_score ?? 0)
    return sum || '—'
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId)

  const renderGradeInput = (student: StudentWithGrade, field: (typeof GRADE_FIELDS)[number]) => {
    const statusKey = `${student.id}-${field.key}`
    const status = saveStatus[statusKey]
    return (
      <div className="relative">
        <input
          type="number"
          min={0}
          max={field.max}
          step={0.5}
          value={student.grades?.[field.key] ?? ''}
          onChange={(e) => handleGradeChange(student.id, field.key, e.target.value)}
          onBlur={() => handleGradeBlur(student.id, field.key)}
          className="touch-target w-full min-w-0 rounded border border-green/20 bg-white px-2 py-2 text-center text-green outline-none focus:border-green md:w-16 md:py-1.5"
          dir="ltr"
          inputMode="decimal"
        />
        {status === 'saved' && (
          <span className="animate-check absolute -top-1 -left-1 text-xs text-green">✓</span>
        )}
        {status === 'error' && (
          <span className="animate-check absolute -top-1 -left-1 text-xs text-red-600">!</span>
        )}
        {status === 'saving' && (
          <span className="absolute -top-1 -left-1 h-2 w-2 animate-pulse rounded-full bg-green/50" />
        )}
      </div>
    )
  }

  const handleExport = async () => {
    if (!selectedSection) return
    setExporting(true)
    setMessage(null)
    setError(null)

    try {
      const blob = await exportSectionGradesToExcel({
        section: selectedSection,
        instructorName: getSectionInstructorName(selectedSection),
        students,
      })
      downloadBlob(
        blob,
        `درجات-مرجع-${selectedSection.section_number}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
      setMessage('تم تصدير الملف بنجاح.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير')
    }

    setExporting(false)
  }

  return (
    <>
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <label className="text-sm font-semibold text-green">اختر الرقم المرجعي:</label>
        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          disabled={loading || sections.length === 0}
          className="field-input sm:w-auto sm:min-w-[16rem]"
        >
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              الرقم المرجعي {sec.section_number}
              {sec.course_title ? ` — ${sec.course_title}` : ''}
            </option>
          ))}
        </select>
        {selectedSection && (
          <div className="flex w-full flex-col gap-2 sm:mr-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <span className="rounded-full bg-green-soft px-3 py-1 text-sm font-medium text-green">
              {students.length} طالب
            </span>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loadingStudents || students.length === 0}
              className="btn-primary w-full sm:w-auto"
            >
              {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      ) : sections.length === 0 ? (
        <div className="panel p-8 text-center text-green/70">
          لا توجد شعب مخصصة لك حالياً. تواصل مع مسؤول النظام.
        </div>
      ) : loadingStudents ? (
        <div className="space-y-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="panel scroll-hint hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-green text-butter">
                  <th className="px-3 py-3.5 text-right font-bold">الرقم الجامعي</th>
                  <th className="px-3 py-3.5 text-right font-bold">اسم الطالب</th>
                  {GRADE_FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-3.5 text-center font-bold">
                      {f.label}
                      <span className="block text-xs font-normal opacity-80">({f.max})</span>
                    </th>
                  ))}
                  <th className="px-3 py-3.5 text-center font-bold">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr
                    key={student.id}
                    className={`table-row-hover ${idx % 2 === 0 ? 'bg-butter/30' : 'bg-white'}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                      {student.university_id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{student.full_name}</td>
                    {GRADE_FIELDS.map((field) => (
                      <td key={field.key} className="px-1 py-1 text-center">
                        {renderGradeInput(student, field)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-green">
                      {calcTotal(student)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {students.map((student) => (
              <article key={student.id} className="mobile-card p-4">
                <div className="mb-3 border-b border-green/10 pb-3">
                  <p className="font-bold text-green">{student.full_name}</p>
                  <p className="mt-1 font-mono text-xs text-green/70" dir="ltr">
                    {student.university_id}
                  </p>
                  <p className="mt-2 text-sm font-bold text-green">
                    المجموع: {calcTotal(student)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {GRADE_FIELDS.map((field) => (
                    <label key={field.key} className="block text-xs text-green/80">
                      <span className="mb-1 block font-medium">
                        {field.label} ({field.max})
                      </span>
                      {renderGradeInput(student, field)}
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  )
}
