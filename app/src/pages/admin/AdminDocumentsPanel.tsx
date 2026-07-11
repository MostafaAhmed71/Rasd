import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { downloadInstructorDocument, uploadInstructorDocument } from '../../lib/documents'
import { supabase } from '../../lib/supabase'
import type { DocumentType, InstructorDocument, Profile } from '../../types/database'
import { DOCUMENT_TYPE_LABELS } from '../../types/database'

interface AdminDocumentsPanelProps {
  instructors: Profile[]
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void
}

export function AdminDocumentsPanel({ instructors, onMessage }: AdminDocumentsPanelProps) {
  const [documents, setDocuments] = useState<InstructorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [instructorId, setInstructorId] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('supervision')
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const loadDocuments = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    const { data, error } = await supabase
      .from('instructor_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      onMessageRef.current({ type: 'error', text: error.message })
    } else {
      setDocuments((data as InstructorDocument[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useRefreshOnFocus(() => loadDocuments({ silent: true }))

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !instructorId) return

    if (file.type !== 'application/pdf') {
      onMessage({ type: 'error', text: 'يرجى رفع ملف PDF فقط.' })
      return
    }

    setUploading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const adminId = sessionData.session?.user?.id
      if (!adminId) throw new Error('يجب تسجيل الدخول')

      const doc = await uploadInstructorDocument(instructorId, documentType, file, adminId)
      setDocuments((prev) => [
        doc,
        ...prev.filter(
          (d) => !(d.instructor_id === doc.instructor_id && d.document_type === doc.document_type),
        ),
      ])
      onMessage({
        type: 'success',
        text: `تم رفع ${DOCUMENT_TYPE_LABELS[documentType]} بنجاح.`,
      })
      await loadDocuments({ silent: true })
    } catch (err) {
      onMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'حدث خطأ أثناء الرفع',
      })
    }
    setUploading(false)
  }

  const instructorName = (doc: InstructorDocument) =>
    instructors.find((i) => i.id === doc.instructor_id)?.full_name ?? '—'

  const handleDownload = async (doc: InstructorDocument) => {
    setDownloadingId(doc.id)
    try {
      await downloadInstructorDocument(doc.file_path, doc.file_name)
    } catch (err) {
      onMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر تنزيل الملف',
      })
    }
    setDownloadingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="panel p-4 sm:p-6">
        <h2 className="font-display mb-2 text-lg font-bold text-green">رفع مستندات الأعضاء</h2>
        <p className="mb-4 text-sm text-green/70">
          ارفع جدول المراقبة أو جدول عضو هيئة التدريس بصيغة PDF لعضو تدريس محدد.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm text-green">
            عضو التدريس
            <select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              className="field-input mt-1"
            >
              <option value="">— اختر —</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-green">
            نوع المستند
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="field-input mt-1"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <label className="btn-primary w-full cursor-pointer">
              {uploading ? 'جاري الرفع...' : 'اختر ملف PDF'}
              <input
                type="file"
                accept="application/pdf"
                onChange={handleUpload}
                disabled={uploading || !instructorId}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="panel p-4 sm:p-6">
        <h2 className="font-display mb-4 text-lg font-bold text-green">المستندات المرفوعة</h2>
        {loading ? (
          <p className="text-green/70">جاري التحميل...</p>
        ) : documents.length === 0 ? (
          <p className="text-green/70">لا توجد مستندات مرفوعة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-green/10 bg-butter/40 text-green">
                  <th className="px-3 py-2 text-right font-bold">عضو التدريس</th>
                  <th className="px-3 py-2 text-right font-bold">النوع</th>
                  <th className="px-3 py-2 text-right font-bold">الملف</th>
                  <th className="px-3 py-2 text-right font-bold">التاريخ</th>
                  <th className="px-3 py-2 text-center font-bold">تنزيل</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="table-row-hover border-b border-green/5">
                    <td className="px-3 py-2">{instructorName(doc)}</td>
                    <td className="px-3 py-2">{DOCUMENT_TYPE_LABELS[doc.document_type]}</td>
                    <td className="px-3 py-2">{doc.file_name}</td>
                    <td className="px-3 py-2">
                      {new Date(doc.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        {downloadingId === doc.id ? '...' : 'تنزيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
