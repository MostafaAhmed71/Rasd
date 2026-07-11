import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/Alert'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { CourseType, Section } from '../../types/database'
import { COURSE_TYPE_LABELS } from '../../types/database'

interface CourseCard {
  section: Section
  studentCount: number
  gradedCount: number
}

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [sectionsRes, studentsRes] = await Promise.all([
      supabase.from('sections').select('*').order('section_number'),
      supabase.from('students').select('id, section_id, grades(student_id)'),
    ])

    if (sectionsRes.error) {
      setError(sectionsRes.error.message)
      setLoading(false)
      return
    }

    const students = studentsRes.data ?? []
    const cards: CourseCard[] = ((sectionsRes.data as Section[]) ?? []).map((section) => {
      const sectionStudents = students.filter((s) => s.section_id === section.id)
      const gradedCount = sectionStudents.filter((s) => {
        const g = Array.isArray(s.grades) ? s.grades[0] : s.grades
        return g != null
      }).length
      return { section, studentCount: sectionStudents.length, gradedCount }
    })

    setCourses(cards)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  useRefreshOnFocus(() => loadCourses())

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">المواد الدراسية</h2>
        <p className="mt-1 text-sm text-text-secondary">المقررات والشعب المخصصة لك</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-36 w-full" />
          <div className="skeleton h-36 w-full" />
        </div>
      ) : courses.length === 0 ? (
        <div className="panel p-8 text-center text-text-secondary">
          لا توجد مواد مخصصة لك حالياً.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map(({ section, studentCount, gradedCount }) => {
            const pct = studentCount > 0 ? Math.round((gradedCount / studentCount) * 100) : 0
            const courseType = (section.course_type ?? 'regular') as CourseType
            return (
              <article key={section.id} className="panel animate-fade-up flex flex-col p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <StatusBadge label={`${studentCount} طالب`} tone="success" />
                  <StatusBadge label={COURSE_TYPE_LABELS[courseType]} tone="neutral" />
                </div>
                <h3 className="font-display text-lg font-bold text-primary-dark">
                  {section.course_title ?? 'مقرر بدون اسم'}
                </h3>
                <p className="mt-1 text-sm text-text-secondary" dir="ltr">
                  {section.course_code ?? '—'} — شعبة {section.section_number}
                </p>
                <div className="mt-4">
                  <ProgressBar value={pct} />
                </div>
                <div className="mt-auto flex gap-2 pt-5">
                  <Link
                    to={`/instructor/grades?section=${section.id}`}
                    className="btn-secondary flex-1 text-sm"
                  >
                    التفاصيل
                  </Link>
                  <Link
                    to={`/instructor/grades?section=${section.id}`}
                    className="btn-primary flex-1 text-sm"
                  >
                    رصد الدرجات
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
