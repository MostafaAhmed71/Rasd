import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { getInstructorNameFromSections } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type {
  AbsenceLectureInput,
  AbsenceRequest,
  ApologyType,
  LectureMode,
  Section,
} from '../../types/database'
import {
  ABSENCE_STATUS_LABELS,
  APOLOGY_TYPE_LABELS,
  LECTURE_MODE_LABELS,
} from '../../types/database'

function emptyLecture(): AbsenceLectureInput {
  return {
    course_name: '',
    section_number: '',
    course_code: '',
    lecture_date: '',
    lecture_time: '',
    lecture_mode: 'in_person',
    apology_type: 'full_absence',
  }
}

function lectureFromSection(section: Section): AbsenceLectureInput {
  return {
    ...emptyLecture(),
    course_name: section.course_title ?? '',
    section_number: String(section.section_number),
    course_code: section.course_code ?? '',
  }
}

function uniqueCourseNames(sections: Section[]): string[] {
  return [...new Set(sections.map((s) => s.course_title).filter((t): t is string => !!t))]
}

function sectionsForCourse(sections: Section[], courseName: string): Section[] {
  return sections.filter((s) => s.course_title === courseName)
}

function findMatchingSection(
  sections: Section[],
  courseName: string,
  sectionNumber: string,
): Section | undefined {
  return sections.find(
    (s) => s.course_title === courseName && String(s.section_number) === sectionNumber,
  )
}

const fieldClass = 'field-input mt-1 text-sm'

interface LectureCourseFieldsProps {
  lecture: AbsenceLectureInput
  sections: Section[]
  onChange: (field: keyof AbsenceLectureInput, value: string) => void
  onBatchChange: (updates: Partial<AbsenceLectureInput>) => void
}

function LectureCourseFields({
  lecture,
  sections,
  onChange,
  onBatchChange,
}: LectureCourseFieldsProps) {
  const hasSections = sections.length > 0
  const courseNames = uniqueCourseNames(sections)
  const courseSections = lecture.course_name
    ? sectionsForCourse(sections, lecture.course_name)
    : []
  const sectionNumbers = [
    ...new Set(courseSections.map((s) => String(s.section_number))),
  ]

  const handleCourseChange = (courseName: string) => {
    const matches = sectionsForCourse(sections, courseName)
    if (matches.length === 1) {
      onBatchChange({
        course_name: courseName,
        section_number: String(matches[0].section_number),
        course_code: matches[0].course_code ?? '',
      })
      return
    }
    onBatchChange({
      course_name: courseName,
      section_number: '',
      course_code: '',
    })
  }

  const handleSectionChange = (sectionNumber: string) => {
    const match = findMatchingSection(sections, lecture.course_name, sectionNumber)
    onBatchChange({
      section_number: sectionNumber,
      course_code: match?.course_code ?? '',
    })
  }

  if (!hasSections) {
    return (
      <>
        <label className="block text-xs text-green/80">
          اسم المقرر *
          <input
            type="text"
            required
            value={lecture.course_name}
            onChange={(e) => onChange('course_name', e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs text-green/80">
          الشعبة
          <input
            type="text"
            value={lecture.section_number}
            onChange={(e) => onChange('section_number', e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs text-green/80">
          رقمها (رمز المقرر)
          <input
            type="text"
            value={lecture.course_code}
            onChange={(e) => onChange('course_code', e.target.value)}
            className={fieldClass}
            dir="ltr"
          />
        </label>
      </>
    )
  }

  return (
    <>
      <label className="block text-xs text-green/80">
        اسم المقرر *
        {courseNames.length <= 1 ? (
          <input
            type="text"
            required
            readOnly
            value={lecture.course_name || courseNames[0] || ''}
            className={`${fieldClass} bg-butter/30 text-green/80`}
          />
        ) : (
          <select
            required
            value={lecture.course_name}
            onChange={(e) => handleCourseChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">— اختر المقرر —</option>
            {courseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="block text-xs text-green/80">
        الشعبة
        {sectionNumbers.length <= 1 ? (
          <input
            type="text"
            readOnly
            value={lecture.section_number || sectionNumbers[0] || ''}
            className={`${fieldClass} bg-butter/30 text-green/80`}
          />
        ) : (
          <select
            value={lecture.section_number}
            onChange={(e) => handleSectionChange(e.target.value)}
            className={fieldClass}
            disabled={!lecture.course_name}
          >
            <option value="">— اختر الشعبة —</option>
            {sectionNumbers.map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="block text-xs text-green/80">
        رقمها (رمز المقرر)
        <input
          type="text"
          readOnly
          value={lecture.course_code}
          className={`${fieldClass} bg-butter/30 text-green/80`}
          dir="ltr"
        />
      </label>
    </>
  )
}

export function AbsencePage() {
  const { user, profile } = useAuth()
  const [sections, setSections] = useState<Section[]>([])
  const [requests, setRequests] = useState<AbsenceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [college, setCollege] = useState('الكلية التطبيقية (رفحاء)')
  const [lectures, setLectures] = useState<AbsenceLectureInput[]>([emptyLecture()])

  const instructorDisplayName = useMemo(
    () => getInstructorNameFromSections(sections, profile?.full_name),
    [sections, profile?.full_name],
  )

  const loadSections = useCallback(async () => {
    const { data, error: secError } = await supabase
      .from('sections')
      .select('*')
      .order('section_number')

    if (!secError && data) {
      setSections(data as Section[])
    }
  }, [])

  const loadRequests = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return
    if (!opts?.silent) setLoading(true)

    const { data, error: reqError } = await supabase
      .from('absence_requests')
      .select('*, absence_request_lectures(*)')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false })

    if (reqError) {
      setError(reqError.message)
    } else {
      setRequests((data as AbsenceRequest[]) ?? [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    void loadSections()
    void loadRequests()
  }, [loadSections, loadRequests])

  useRefreshOnFocus(() => {
    void loadSections()
    void loadRequests({ silent: true })
  })

  useEffect(() => {
    if (!showForm || sections.length === 0) return

    const courses = uniqueCourseNames(sections)

    if (sections.length === 1) {
      setLectures([lectureFromSection(sections[0])])
      return
    }

    if (courses.length === 1) {
      setLectures((prev) =>
        prev.map((row) => {
          const matches = sectionsForCourse(sections, courses[0])
          if (matches.length === 1) return lectureFromSection(matches[0])
          return {
            ...row,
            course_name: row.course_name || courses[0],
          }
        }),
      )
    }
  }, [showForm, sections])

  const updateLecture = (index: number, field: keyof AbsenceLectureInput, value: string) => {
    setLectures((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  const updateLectureFields = (index: number, updates: Partial<AbsenceLectureInput>) => {
    setLectures((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    )
  }

  const addLectureRow = () => {
    const newRow =
      sections.length === 1 ? lectureFromSection(sections[0]) : emptyLecture()
    setLectures((prev) => [...prev, newRow])
  }

  const removeLectureRow = (index: number) => {
    if (lectures.length <= 1) return
    setLectures((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setCollege('الكلية التطبيقية (رفحاء)')
    setLectures(sections.length === 1 ? [lectureFromSection(sections[0])] : [emptyLecture()])
    setShowForm(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    const validLectures = lectures.filter((l) => l.course_name && l.lecture_date && l.lecture_time)
    if (validLectures.length === 0) {
      setError('أضف محاضرة واحدة على الأقل مع اسم المقرر والتاريخ والوقت.')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const { data: request, error: reqError } = await supabase
        .from('absence_requests')
        .insert({
          instructor_id: user.id,
          college,
        })
        .select()
        .single()

      if (reqError) throw reqError

      const lecturesPayload = validLectures.map((lecture, index) => ({
        request_id: request.id,
        row_order: index + 1,
        course_name: lecture.course_name,
        section_number: lecture.section_number || null,
        course_code: lecture.course_code || null,
        lecture_date: lecture.lecture_date,
        lecture_time: lecture.lecture_time,
        lecture_mode: lecture.lecture_mode,
        apology_type: lecture.apology_type,
      }))

      const { error: lecError } = await supabase
        .from('absence_request_lectures')
        .insert(lecturesPayload)

      if (lecError) throw lecError

      setMessage('تم إرسال طلب الاعتذار بنجاح.')
      resetForm()
      await loadRequests({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإرسال')
    }

    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="panel p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-lg font-bold text-green">طلبات الاعتذار عن المحاضرة</h2>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => {
                const next = !v
                if (next && sections.length === 1) {
                  setLectures([lectureFromSection(sections[0])])
                }
                return next
              })
            }}
            className={showForm ? 'btn-ghost' : 'btn-primary'}
          >
            {showForm ? 'إلغاء' : 'طلب جديد'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="animate-scale-in mb-8 space-y-6 border-b border-green/10 pb-8"
          >
            <div className="rounded-xl bg-gradient-to-l from-green/10 to-green-soft/60 p-4 text-center">
              <h3 className="font-display text-base font-bold text-green">نموذج اعتذار عن محاضرة</h3>
              <p className="mt-1 text-sm text-green/70">جامعة الحدود الشمالية</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-green">
                الكلية
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="field-input mt-1"
                />
              </label>
              <label className="block text-sm text-green">
                اسم عضو التدريس
                <input
                  type="text"
                  value={instructorDisplayName}
                  readOnly
                  className="field-input mt-1 bg-green-soft/50 text-green/70"
                />
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-green">بيانات المحاضرات</h4>
              {lectures.map((lecture, index) => (
                <div
                  key={index}
                  className="animate-fade-up rounded-xl border border-green/10 bg-green-soft/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-green">محاضرة {index + 1}</span>
                    {lectures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLectureRow(index)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <LectureCourseFields
                      lecture={lecture}
                      sections={sections}
                      onChange={(field, value) => updateLecture(index, field, value)}
                      onBatchChange={(updates) => updateLectureFields(index, updates)}
                    />
                    <label className="block text-xs text-green/80">
                      التاريخ *
                      <input
                        type="date"
                        required
                        value={lecture.lecture_date}
                        onChange={(e) => updateLecture(index, 'lecture_date', e.target.value)}
                        className="field-input mt-1 text-sm"
                        dir="ltr"
                      />
                    </label>
                    <label className="block text-xs text-green/80">
                      الوقت *
                      <input
                        type="time"
                        required
                        value={lecture.lecture_time}
                        onChange={(e) => updateLecture(index, 'lecture_time', e.target.value)}
                        className="field-input mt-1 text-sm"
                        dir="ltr"
                      />
                    </label>
                    <label className="block text-xs text-green/80">
                      نمط المحاضرة
                      <select
                        value={lecture.lecture_mode}
                        onChange={(e) =>
                          updateLecture(index, 'lecture_mode', e.target.value as LectureMode)
                        }
                        className="field-input mt-1 text-sm"
                      >
                        {Object.entries(LECTURE_MODE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-green/80 sm:col-span-2 lg:col-span-3">
                      نوع الاعتذار
                      <select
                        value={lecture.apology_type}
                        onChange={(e) =>
                          updateLecture(index, 'apology_type', e.target.value as ApologyType)
                        }
                        className="field-input mt-1 text-sm"
                      >
                        {Object.entries(APOLOGY_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addLectureRow}
                className="text-sm font-medium text-green hover:underline"
              >
                + إضافة محاضرة أخرى
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-green/70">جاري التحميل...</p>
        ) : requests.length === 0 ? (
          <p className="text-green/70">لا توجد طلبات سابقة.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <article
                key={req.id}
                className="animate-fade-up rounded-xl border border-green/10 bg-green-soft/25 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-green">
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

                <ul className="space-y-2 text-sm">
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
                        {(lec.section_number || lec.course_code) && (
                          <p className="text-xs text-green/60">
                            {lec.section_number ? `شعبة ${lec.section_number}` : ''}
                            {lec.course_code ? ` — ${lec.course_code}` : ''}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>

                {req.admin_note && (
                  <p className="mt-3 rounded bg-white p-3 text-sm text-green/80">
                    <strong>ملاحظة المسؤول:</strong> {req.admin_note}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
