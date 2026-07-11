import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { Alert } from '../components/Alert'
import { Layout } from '../components/Layout'
import { PageMotion } from '../components/PageMotion'
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus'
import { downloadBlob, exportGradesToExcel } from '../lib/exportExcel'
import { parseImportFile } from '../lib/import'
import { getSectionInstructorName, matchInstructorId } from '../lib/sections'
import { supabase } from '../lib/supabase'
import { AdminAbsencePanel } from './admin/AdminAbsencePanel'
import { AdminCoursesPanel } from './admin/AdminCoursesPanel'
import { AdminDocumentsPanel } from './admin/AdminDocumentsPanel'
import type { Profile, Section, StudentWithGrade } from '../types/database'
import { IMPORT_COLUMNS } from '../types/database'

interface SectionProgress {
  section: Section
  instructorName: string
  totalStudents: number
  gradedStudents: number
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'data' | 'courses' | 'documents' | 'absence'>('data')
  const [sections, setSections] = useState<SectionProgress[]>([])
  const [instructors, setInstructors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)

    const [sectionsRes, instructorsRes, studentsRes] = await Promise.all([
      supabase.from('sections').select('*, profiles(full_name)').order('section_number'),
      supabase.from('profiles').select('*').eq('role', 'instructor').order('full_name'),
      supabase.from('students').select('id, section_id, grades(student_id)'),
    ])

    if (sectionsRes.error) {
      setMessage({ type: 'error', text: sectionsRes.error.message })
      setLoading(false)
      return
    }

    const students = studentsRes.data ?? []
    const progress: SectionProgress[] = (sectionsRes.data ?? []).map((sec) => {
      const sectionStudents = students.filter((s) => s.section_id === sec.id)
      const graded = sectionStudents.filter((s) => {
        const g = Array.isArray(s.grades) ? s.grades[0] : s.grades
        return g != null
      }).length
      const instructor = sec.profiles as { full_name: string | null } | null
      return {
        section: sec as Section,
        instructorName: getSectionInstructorName({
          ...(sec as Section),
          profiles: instructor,
        }),
        totalStudents: sectionStudents.length,
        gradedStudents: graded,
      }
    })

    setSections(progress)
    setInstructors((instructorsRes.data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const prevTabRef = useRef(activeTab)
  useEffect(() => {
    if (
      (activeTab === 'data' || activeTab === 'courses') &&
      prevTabRef.current !== activeTab
    ) {
      void loadData({ silent: true })
    }
    prevTabRef.current = activeTab
  }, [activeTab, loadData])

  useRefreshOnFocus(() => {
    if (activeTab === 'data' || activeTab === 'courses') void loadData({ silent: true })
  })

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setMessage(null)

    try {
      const rows = await parseImportFile(file)
      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'لم يتم العثور على بيانات صالحة في الملف.' })
        setImporting(false)
        return
      }

      const sectionNumbers = [...new Set(rows.map((r) => r.section_number))]
      const [{ data: existingSections }, { data: instructorProfiles }] = await Promise.all([
        supabase.from('sections').select('*').in('section_number', sectionNumbers),
        supabase.from('profiles').select('*').eq('role', 'instructor'),
      ])

      const sectionMap = new Map<number, string>()
      for (const num of sectionNumbers) {
        const sample = rows.find((r) => r.section_number === num)
        if (!sample) continue

        const instructorId = matchInstructorId(sample.instructor_name, instructorProfiles ?? [])
        const sectionPayload = {
          course_title: sample.course ?? null,
          course_code: sample.course_code ?? null,
          program: sample.major ?? null,
          term: sample.period ?? null,
          instructor_name: sample.instructor_name ?? null,
        }

        const existing = existingSections?.find((s) => s.section_number === num)
        if (existing) {
          const { error } = await supabase
            .from('sections')
            .update({
              ...sectionPayload,
              instructor_id: existing.instructor_id ?? instructorId,
            })
            .eq('id', existing.id)
          if (error) throw error
          sectionMap.set(num, existing.id)
        } else {
          const { data: newSec, error } = await supabase
            .from('sections')
            .insert({ section_number: num, ...sectionPayload, instructor_id: instructorId })
            .select()
            .single()
          if (error) throw error
          sectionMap.set(num, newSec.id)
        }
      }

      const studentsPayload = rows.map((row) => ({
        university_id: row.university_id,
        full_name: row.full_name,
        major: row.major ?? null,
        course: row.course ?? null,
        course_code: row.course_code ?? null,
        type: row.type ?? null,
        period: row.period ?? null,
        section_id: sectionMap.get(row.section_number)!,
      }))

      const { error: upsertError } = await supabase
        .from('students')
        .upsert(studentsPayload, { onConflict: 'university_id' })

      if (upsertError) throw upsertError

      setMessage({ type: 'success', text: `تم استيراد ${rows.length} طالب بنجاح.` })
      await loadData({ silent: true })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'حدث خطأ أثناء الاستيراد',
      })
    }

    setImporting(false)
  }

  const handleAssignInstructor = async (sectionId: string, instructorId: string) => {
    const { error } = await supabase
      .from('sections')
      .update({ instructor_id: instructorId || null })
      .eq('id', sectionId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    const instructor = instructors.find((i) => i.id === instructorId)
    setSections((prev) =>
      prev.map((item) =>
        item.section.id === sectionId
          ? {
              ...item,
              section: {
                ...item.section,
                instructor_id: instructorId || null,
              },
              instructorName:
                item.section.instructor_name?.trim() ||
                instructor?.full_name ||
                item.instructorName,
            }
          : item,
      ),
    )
    setMessage({ type: 'success', text: 'تم ربط عضو التدريس بالشعبة.' })
    await loadData({ silent: true })
  }

  const handleExport = async () => {
    setExporting(true)
    setMessage(null)

    try {
      const { data: sectionsData, error: secError } = await supabase
        .from('sections')
        .select('*, profiles(full_name)')
        .order('section_number')

      if (secError) throw secError

      const exportSections = []
      for (const sec of sectionsData ?? []) {
        const { data: students, error: stError } = await supabase
          .from('students')
          .select('*, grades(*)')
          .eq('section_id', sec.id)
          .order('university_id')

        if (stError) throw stError

        exportSections.push({
          section: sec as Section,
          instructorName: getSectionInstructorName(sec as Section & { profiles: typeof sec.profiles }),
          students: (students ?? []).map((row) => ({
            ...(row as StudentWithGrade),
            grades: Array.isArray(row.grades) ? row.grades[0] ?? null : row.grades,
          })),
        })
      }

      const blob = await exportGradesToExcel(exportSections)
      downloadBlob(blob, `درجات-التدريب-الميداني-${new Date().toISOString().slice(0, 10)}.xlsx`)
      setMessage({ type: 'success', text: 'تم تصدير الملف بنجاح.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'حدث خطأ أثناء التصدير',
      })
    }

    setExporting(false)
  }

  return (
    <Layout title="لوحة مسؤول النظام">
      <AdminNav active={activeTab} onChange={setActiveTab} />

      {message && <Alert type={message.type}>{message.text}</Alert>}

      {activeTab === 'courses' && (
        <PageMotion key="courses">
          {loading ? (
            <p className="text-green/70">جاري التحميل...</p>
          ) : (
            <AdminCoursesPanel
              sections={sections}
              instructors={instructors}
              onMessage={setMessage}
              onReload={async () => {
                await loadData({ silent: true })
              }}
            />
          )}
        </PageMotion>
      )}

      {activeTab === 'documents' && (
        <PageMotion key="documents">
          <AdminDocumentsPanel instructors={instructors} onMessage={setMessage} />
        </PageMotion>
      )}

      {activeTab === 'absence' && (
        <PageMotion key="absence">
          <AdminAbsencePanel onMessage={setMessage} />
        </PageMotion>
      )}

      {activeTab === 'data' && (
        <PageMotion key="data">
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="panel animate-fade-up stagger-1 p-4 sm:p-6">
          <h2 className="font-display mb-2 text-lg font-bold text-green">استيراد بيانات الطلاب</h2>
          <p className="mb-4 text-sm text-green/70">
            ارفع ملف Excel أو CSV بالأعمدة التالية:
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {IMPORT_COLUMNS.map((col) => (
              <span
                key={col}
                className="rounded-full bg-butter px-3 py-1 text-xs font-medium text-green"
              >
                {col}
              </span>
            ))}
          </div>
          <label className="btn-primary w-full cursor-pointer sm:w-auto">
            {importing ? 'جاري الاستيراد...' : 'اختر ملف للاستيراد'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>

        <div className="panel animate-fade-up stagger-2 p-4 sm:p-6">
          <h2 className="font-display mb-2 text-lg font-bold text-green">تصدير النتيجة النهائية</h2>
          <p className="mb-4 text-sm text-green/70">
            تصدير ملف Excel بشيت منفصل لكل شعبة بنفس تصميم الشيت الأصلي
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || sections.length === 0}
            className="btn-primary w-full sm:w-auto"
          >
            {exporting ? 'جاري التصدير...' : 'تصدير النتيجة'}
          </button>
        </div>
      </div>

      <div className="panel animate-fade-up stagger-3 p-4 sm:p-6">
        <h2 className="font-display mb-4 text-lg font-bold text-green">الشعب ونسبة الإنجاز</h2>

        {loading ? (
          <p className="text-green/70">جاري التحميل...</p>
        ) : sections.length === 0 ? (
          <p className="text-green/70">لا توجد شعب بعد. ابدأ باستيراد بيانات الطلاب.</p>
        ) : (
          <>
            <div className="scroll-hint hidden overflow-x-auto md:block">
              <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-green/10 bg-butter/40 text-green">
                  <th className="px-4 py-3 text-right font-bold">الرقم المرجعي</th>
                  <th className="px-4 py-3 text-right font-bold">رمز المقرر</th>
                  <th className="px-4 py-3 text-right font-bold">المقرر</th>
                  <th className="px-4 py-3 text-right font-bold">عضو التدريس</th>
                  <th className="px-4 py-3 text-center font-bold">الإنجاز</th>
                  <th className="px-4 py-3 text-right font-bold">ربط المدرّس</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((item) => {
                  const pct =
                    item.totalStudents > 0
                      ? Math.round((item.gradedStudents / item.totalStudents) * 100)
                      : 0
                  return (
                    <tr key={item.section.id} className="table-row-hover border-b border-green/5">
                      <td className="px-4 py-3 font-bold">{item.section.section_number}</td>
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                        {item.section.course_code ?? '—'}
                      </td>
                      <td className="px-4 py-3">{item.section.course_title ?? '—'}</td>
                      <td className="px-4 py-3">{item.instructorName}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>
                            {item.gradedStudents} / {item.totalStudents}
                          </span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-butter">
                            <div
                              className="h-full rounded-full bg-green transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-green/60">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.section.instructor_id ?? ''}
                          onChange={(e) =>
                            handleAssignInstructor(item.section.id, e.target.value)
                          }
                          className="touch-target w-full max-w-[200px] rounded border border-green/20 px-2 py-2 text-green outline-none focus:border-green"
                        >
                          <option value="">— اختر —</option>
                          {instructors.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>

            <div className="space-y-3 md:hidden">
              {sections.map((item) => {
                const pct =
                  item.totalStudents > 0
                    ? Math.round((item.gradedStudents / item.totalStudents) * 100)
                    : 0
                return (
                  <article key={item.section.id} className="mobile-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-green">
                          المرجع {item.section.section_number}
                        </p>
                        <p className="text-sm text-green/70">{item.section.course_title ?? '—'}</p>
                      </div>
                      <span className="rounded-full bg-butter px-2 py-1 text-xs font-medium text-green">
                        {pct}%
                      </span>
                    </div>
                    <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-green/60">رمز المقرر</dt>
                        <dd className="font-mono" dir="ltr">
                          {item.section.course_code ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-green/60">عضو التدريس</dt>
                        <dd>{item.instructorName}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-green/60">الإنجاز</dt>
                        <dd>
                          {item.gradedStudents} / {item.totalStudents}
                        </dd>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-butter">
                          <div
                            className="h-full rounded-full bg-green transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </dl>
                    <label className="block text-sm text-green/80">
                      ربط المدرّس
                      <select
                        value={item.section.instructor_id ?? ''}
                        onChange={(e) =>
                          handleAssignInstructor(item.section.id, e.target.value)
                        }
                        className="touch-target mt-1 w-full rounded border border-green/20 px-2 py-2 text-green outline-none focus:border-green"
                      >
                        <option value="">— اختر —</option>
                        {instructors.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-green/10 bg-green-soft/60 p-4 text-sm text-green/80 animate-fade-up">
        <strong>ملاحظة:</strong> لإضافة أعضاء تدريس جدد، أنشئ حساباتهم من لوحة Supabase (Authentication
        → Users) مع تحديد الدور في metadata:{' '}
        <code className="rounded bg-white px-1" dir="ltr">
          {`{"role": "instructor", "full_name": "اسم المدرّس"}`}
        </code>
      </div>
        </PageMotion>
      )}
    </Layout>
  )
}
