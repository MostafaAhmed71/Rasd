import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/Alert'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { getSectionInstructorName } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type { Section } from '../../types/database'

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
      return {
        section,
        studentCount: sectionStudents.length,
        gradedCount,
      }
    })

    setCourses(cards)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  useRefreshOnFocus(() => loadCourses())

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-6">
        <h2 className="font-display mb-1 text-lg font-bold text-green">موادي</h2>
        <p className="text-sm text-green/70">
          المقررات المخصصة لك. اختر مادة لرصد درجاتها (أعمال السنة · النصفي · النهائي).
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : courses.length === 0 ? (
        <div className="panel p-8 text-center text-green/70">
          لا توجد مواد مخصصة لك حالياً. تواصل مع مسؤول النظام.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ section, studentCount, gradedCount }) => {
            const pct =
              studentCount > 0 ? Math.round((gradedCount / studentCount) * 100) : 0
            return (
              <Link
                key={section.id}
                to={`/instructor/grades?section=${section.id}`}
                className="panel animate-fade-up block p-4 transition hover:-translate-y-0.5 hover:border-green/30"
              >
                <p className="font-display text-base font-bold text-green">
                  {section.course_title ?? 'مقرر بدون اسم'}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-green/80">
                  <div>
                    <dt className="text-xs text-green/50">رمز المقرر</dt>
                    <dd className="font-mono" dir="ltr">
                      {section.course_code ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-green/50">رقم الشعبة</dt>
                    <dd className="font-bold">{section.section_number}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-green/50">مدرس المقرر</dt>
                    <dd>{getSectionInstructorName(section)}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-green/60">
                    <span>
                      الإنجاز: {gradedCount} / {studentCount}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-green-soft">
                    <div
                      className="h-full rounded-full bg-green transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-green">رصد درجات هذه المادة ←</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
