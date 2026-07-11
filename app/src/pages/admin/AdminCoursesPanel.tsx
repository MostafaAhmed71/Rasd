import { type FormEvent, useState } from 'react'
import { getSectionInstructorName } from '../../lib/sections'
import { supabase } from '../../lib/supabase'
import type { Profile, Section } from '../../types/database'

interface SectionProgress {
  section: Section
  instructorName: string
  totalStudents: number
  gradedStudents: number
}

interface AdminCoursesPanelProps {
  sections: SectionProgress[]
  instructors: Profile[]
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void
  onReload: () => Promise<void>
}

interface CourseForm {
  section_number: string
  course_title: string
  course_code: string
  instructor_id: string
  instructor_name: string
  term: string
  program: string
}

const emptyForm = (): CourseForm => ({
  section_number: '',
  course_title: '',
  course_code: '',
  instructor_id: '',
  instructor_name: '',
  term: '',
  program: '',
})

export function AdminCoursesPanel({
  sections,
  instructors,
  onMessage,
  onReload,
}: AdminCoursesPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (section: Section) => {
    setEditingId(section.id)
    setForm({
      section_number: String(section.section_number),
      course_title: section.course_title ?? '',
      course_code: section.course_code ?? '',
      instructor_id: section.instructor_id ?? '',
      instructor_name: section.instructor_name ?? '',
      term: section.term ?? '',
      program: section.program ?? '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleInstructorSelect = (instructorId: string) => {
    const inst = instructors.find((i) => i.id === instructorId)
    setForm((prev) => ({
      ...prev,
      instructor_id: instructorId,
      instructor_name:
        prev.instructor_name.trim() ||
        inst?.full_name ||
        prev.instructor_name,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const sectionNumber = Number(form.section_number)
    if (!Number.isFinite(sectionNumber) || sectionNumber <= 0) {
      onMessage({ type: 'error', text: 'أدخل رقم شعبة صحيحاً.' })
      return
    }
    if (!form.course_title.trim()) {
      onMessage({ type: 'error', text: 'اسم المقرر مطلوب.' })
      return
    }

    setSaving(true)
    const payload = {
      section_number: sectionNumber,
      course_title: form.course_title.trim(),
      course_code: form.course_code.trim() || null,
      instructor_id: form.instructor_id || null,
      instructor_name: form.instructor_name.trim() || null,
      term: form.term.trim() || null,
      program: form.program.trim() || null,
    }

    const { error } = editingId
      ? await supabase.from('sections').update(payload).eq('id', editingId)
      : await supabase.from('sections').insert(payload)

    if (error) {
      onMessage({ type: 'error', text: error.message })
    } else {
      onMessage({
        type: 'success',
        text: editingId ? 'تم تحديث المادة بنجاح.' : 'تم إضافة المادة بنجاح.',
      })
      closeForm()
      await onReload()
    }
    setSaving(false)
  }

  const handleDelete = async (sectionId: string) => {
    if (
      !confirm(
        'حذف المادة؟ سيتم فك ارتباط الطلاب بها. الدرجات المرتبطة بالطلاب تبقى في قاعدة البيانات.',
      )
    ) {
      return
    }
    setDeletingId(sectionId)
    const { error } = await supabase.from('sections').delete().eq('id', sectionId)
    if (error) {
      onMessage({ type: 'error', text: error.message })
    } else {
      onMessage({ type: 'success', text: 'تم حذف المادة.' })
      await onReload()
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="panel p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-green">إدارة المواد والشعب</h2>
            <p className="mt-1 text-sm text-green/70">
              إضافة أو تعديل المقرر ورمز المقرر ورقم الشعبة وربط عضو التدريس.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            + إضافة مادة
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="animate-scale-in mb-6 space-y-4 rounded-xl border border-green/10 bg-green-soft/30 p-4"
          >
            <h3 className="font-bold text-green">
              {editingId ? 'تعديل مادة' : 'إضافة مادة جديدة'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm text-green">
                رقم الشعبة *
                <input
                  type="number"
                  required
                  min={1}
                  value={form.section_number}
                  onChange={(e) => setForm((p) => ({ ...p, section_number: e.target.value }))}
                  className="field-input mt-1"
                  dir="ltr"
                />
              </label>
              <label className="block text-sm text-green sm:col-span-2">
                اسم المقرر *
                <input
                  type="text"
                  required
                  value={form.course_title}
                  onChange={(e) => setForm((p) => ({ ...p, course_title: e.target.value }))}
                  className="field-input mt-1"
                  placeholder="مثال: التدريب الميداني"
                />
              </label>
              <label className="block text-sm text-green">
                رمز المقرر
                <input
                  type="text"
                  value={form.course_code}
                  onChange={(e) => setForm((p) => ({ ...p, course_code: e.target.value }))}
                  className="field-input mt-1"
                  dir="ltr"
                  placeholder="CS101"
                />
              </label>
              <label className="block text-sm text-green">
                الفترة / الترم
                <input
                  type="text"
                  value={form.term}
                  onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
                  className="field-input mt-1"
                />
              </label>
              <label className="block text-sm text-green">
                البرنامج / التخصص
                <input
                  type="text"
                  value={form.program}
                  onChange={(e) => setForm((p) => ({ ...p, program: e.target.value }))}
                  className="field-input mt-1"
                />
              </label>
              <label className="block text-sm text-green">
                ربط حساب المدرّس
                <select
                  value={form.instructor_id}
                  onChange={(e) => handleInstructorSelect(e.target.value)}
                  className="field-input mt-1"
                >
                  <option value="">— بدون حساب —</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-green sm:col-span-2">
                اسم المدرّس (للعرض والتصدير)
                <input
                  type="text"
                  value={form.instructor_name}
                  onChange={(e) => setForm((p) => ({ ...p, instructor_name: e.target.value }))}
                  className="field-input mt-1"
                  placeholder="يظهر في موادي وفي Excel"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة'}
              </button>
              <button type="button" onClick={closeForm} className="btn-ghost">
                إلغاء
              </button>
            </div>
          </form>
        )}

        {sections.length === 0 ? (
          <p className="text-green/70">لا توجد مواد بعد. أضف مادة أو استورد ملف الطلاب.</p>
        ) : (
          <>
            <div className="scroll-hint hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-green/10 bg-butter/40 text-green">
                    <th className="px-3 py-2 text-right font-bold">الشعبة</th>
                    <th className="px-3 py-2 text-right font-bold">المقرر</th>
                    <th className="px-3 py-2 text-right font-bold">الرمز</th>
                    <th className="px-3 py-2 text-right font-bold">المدرّس</th>
                    <th className="px-3 py-2 text-center font-bold">طلاب</th>
                    <th className="px-3 py-2 text-center font-bold">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((item) => (
                    <tr key={item.section.id} className="table-row-hover border-b border-green/5">
                      <td className="px-3 py-2 font-bold">{item.section.section_number}</td>
                      <td className="px-3 py-2">{item.section.course_title ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                        {item.section.course_code ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {getSectionInstructorName(item.section) !== 'غير محدد'
                          ? getSectionInstructorName(item.section)
                          : item.instructorName}
                      </td>
                      <td className="px-3 py-2 text-center">{item.totalStudents}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item.section)}
                            className="rounded-lg border border-green/20 bg-white px-3 py-1.5 text-xs font-semibold text-green transition hover:bg-green-soft"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.section.id)}
                            disabled={deletingId === item.section.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {sections.map((item) => (
                <article key={item.section.id} className="mobile-card p-4">
                  <p className="font-bold text-green">
                    {item.section.course_title ?? '—'} — شعبة {item.section.section_number}
                  </p>
                  <p className="mt-1 text-sm text-green/70" dir="ltr">
                    {item.section.course_code ?? 'بدون رمز'}
                  </p>
                  <p className="mt-2 text-sm">{item.instructorName}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item.section)}
                      className="btn-primary flex-1 py-2 text-sm"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.section.id)}
                      className="btn-ghost flex-1 border-red-200 py-2 text-sm text-red-700"
                    >
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
