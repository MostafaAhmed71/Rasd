import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import {
  downloadInstructorDocument,
  getDocumentSignedUrl,
  getInstructorDocument,
} from '../../lib/documents'
import type { DocumentType } from '../../types/database'
import { DOCUMENT_TYPE_LABELS } from '../../types/database'

interface DocumentsPageProps {
  documentType: DocumentType
}

export function DocumentsPage({ documentType }: DocumentsPageProps) {
  const { user } = useAuth()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadedAt, setUploadedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filePathRef = useRef<string | null>(null)

  const loadDocument = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user) return
      if (!opts?.silent) {
        setLoading(true)
        setPdfUrl(null)
        setFilePath(null)
        filePathRef.current = null
      }
      setError(null)

      try {
        const doc = await getInstructorDocument(user.id, documentType)
        if (!doc) {
          setFileName(null)
          setUploadedAt(null)
          setPdfUrl(null)
          setFilePath(null)
          filePathRef.current = null
          setLoading(false)
          return
        }

        setFileName(doc.file_name)
        setUploadedAt(doc.created_at)
        setFilePath(doc.file_path)

        if (!opts?.silent || filePathRef.current !== doc.file_path) {
          const url = await getDocumentSignedUrl(doc.file_path)
          setPdfUrl(url)
          filePathRef.current = doc.file_path
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل المستند')
      }

      setLoading(false)
    },
    [user, documentType],
  )

  useEffect(() => {
    void loadDocument()
  }, [loadDocument])

  useRefreshOnFocus(() => loadDocument({ silent: true }))

  const handleDownload = async () => {
    if (!filePath || !fileName) return
    setDownloading(true)
    setError(null)
    try {
      await downloadInstructorDocument(filePath, fileName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنزيل الملف')
    }
    setDownloading(false)
  }

  const title = DOCUMENT_TYPE_LABELS[documentType]

  return (
    <div className="panel p-4 sm:p-6">
      <h2 className="font-display mb-4 text-lg font-bold text-green">{title}</h2>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-8 w-1/3" />
          <div className="skeleton h-64 w-full" />
        </div>
      ) : !pdfUrl ? (
        <div className="rounded-xl border border-dashed border-green/20 bg-green-soft/40 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green/10 text-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <p className="text-green/70">
            لم يُرفع {title} بعد. سيظهر هنا عند رفعه من مسؤول النظام.
          </p>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-green/70">
              <p className="font-medium text-green">{fileName}</p>
              {uploadedAt && (
                <p className="mt-1 text-xs">
                  تاريخ الرفع: {new Date(uploadedAt).toLocaleDateString('ar-SA')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary"
              >
                {downloading ? 'جاري التنزيل...' : 'تنزيل الملف'}
              </button>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                فتح في نافذة جديدة
              </a>
            </div>
          </div>
          <iframe
            src={pdfUrl}
            title={title}
            className="h-[70vh] w-full rounded-xl border border-green/10 bg-butter/40 shadow-inner"
          />
        </div>
      )}
    </div>
  )
}
