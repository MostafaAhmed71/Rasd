import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import {
  downloadInstructorDocument,
  getDocumentSignedUrl,
  getInstructorDocument,
} from '../../lib/documents'
import { supabase } from '../../lib/supabase'
import type { DocumentType, InstructorDocument, ScheduleEntry, ScheduleType } from '../../types/database'
import { DOCUMENT_TYPE_LABELS } from '../../types/database'

interface SchedulePageProps {
  scheduleType: ScheduleType
}

export function SchedulePage({ scheduleType }: SchedulePageProps) {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [doc, setDoc] = useState<InstructorDocument | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const title = DOCUMENT_TYPE_LABELS[scheduleType as DocumentType]
  const isStudy = scheduleType === 'study'

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const [entriesRes, document] = await Promise.all([
      supabase
        .from('schedule_entries')
        .select('*')
        .eq('instructor_id', profile.id)
        .eq('schedule_type', scheduleType)
        .order('created_at'),
      getInstructorDocument(profile.id, scheduleType as DocumentType),
    ])

    if (entriesRes.error) setError(entriesRes.error.message)
    else setEntries((entriesRes.data as ScheduleEntry[]) ?? [])

    setDoc(document)
    if (document) {
      try {
        setSignedUrl(await getDocumentSignedUrl(document.file_path))
      } catch {
        setSignedUrl(null)
      }
    } else {
      setSignedUrl(null)
    }
    setLoading(false)
  }, [profile?.id, scheduleType])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) =>
      [e.day_label, e.course_code, e.course_title, e.room, e.section_number, e.time_label]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [entries, query])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          بيانات قابلة للبحث والفرز
          {doc ? ` · المصدر: ${doc.file_name}` : ''}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          className="field-input"
          placeholder="بحث..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {doc && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => void downloadInstructorDocument(doc.file_path, doc.file_name)}
            >
              تنزيل الملف
            </button>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm"
              >
                فتح في نافذة جديدة
              </a>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-48 w-full" />
      ) : filtered.length > 0 ? (
        <div className="panel overflow-x-auto">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr>
                {isStudy ? (
                  <>
                    <th>اليوم</th>
                    <th>الوقت</th>
                    <th>الغرفة</th>
                    <th>رمز المقرر</th>
                    <th>اسم المقرر</th>
                    <th>الشعبة</th>
                    <th>الوحدات</th>
                    <th>العبء</th>
                  </>
                ) : (
                  <>
                    <th>اليوم</th>
                    <th>التاريخ</th>
                    <th>المقرر</th>
                    <th>الشعبة</th>
                    <th>القاعة</th>
                    <th>المراقب الأول</th>
                    <th>المراقب الثاني</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  {isStudy ? (
                    <>
                      <td>{e.day_label ?? '—'}</td>
                      <td>{e.time_label ?? '—'}</td>
                      <td>{e.room ?? '—'}</td>
                      <td dir="ltr">{e.course_code ?? '—'}</td>
                      <td>{e.course_title ?? '—'}</td>
                      <td>{e.section_number ?? '—'}</td>
                      <td>{e.units ?? '—'}</td>
                      <td>{e.workload ?? '—'}</td>
                    </>
                  ) : (
                    <>
                      <td>{e.day_label ?? '—'}</td>
                      <td>{e.entry_date ?? '—'}</td>
                      <td>{e.course_title ?? e.course_code ?? '—'}</td>
                      <td>{e.section_number ?? '—'}</td>
                      <td>{e.room ?? '—'}</td>
                      <td>{e.first_proctor ?? '—'}</td>
                      <td>{e.second_proctor ?? '—'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : doc && signedUrl ? (
        <div className="panel overflow-hidden">
          <iframe title={title} src={signedUrl} className="h-[70vh] w-full border-0" />
        </div>
      ) : (
        <div className="panel p-8 text-center text-text-secondary">
          لا توجد بيانات جدول حالياً. سيظهر الجدول بعد رفعه من إدارة النظام.
        </div>
      )}
    </div>
  )
}
