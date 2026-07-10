import { supabase } from './supabase'
import type { DocumentType, InstructorDocument } from '../types/database'

const BUCKET = 'instructor-documents'

/** مسار آمن لـ Supabase Storage (بدون أحرف عربية أو مسافات) */
function buildStoragePath(instructorId: string, documentType: DocumentType): string {
  return `${instructorId}/${documentType}/${Date.now()}.pdf`
}

export async function uploadInstructorDocument(
  instructorId: string,
  documentType: DocumentType,
  file: File,
  uploadedBy: string,
): Promise<InstructorDocument> {
  const path = buildStoragePath(instructorId, documentType)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf' })

  if (uploadError) throw uploadError

  await supabase
    .from('instructor_documents')
    .delete()
    .eq('instructor_id', instructorId)
    .eq('document_type', documentType)

  const { data, error } = await supabase
    .from('instructor_documents')
    .insert({
      instructor_id: instructorId,
      document_type: documentType,
      file_path: path,
      file_name: file.name,
      uploaded_by: uploadedBy,
    })
    .select()
    .single()

  if (error) throw error
  return data as InstructorDocument
}

export async function getInstructorDocument(
  instructorId: string,
  documentType: DocumentType,
): Promise<InstructorDocument | null> {
  const { data, error } = await supabase
    .from('instructor_documents')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('document_type', documentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as InstructorDocument | null
}

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600)

  if (error) throw error
  return data.signedUrl
}

export async function downloadInstructorDocument(
  filePath: string,
  fileName: string,
): Promise<void> {
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`

  // محاولة التنزيل المباشر أولاً
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath)
  if (!error && data) {
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = safeName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return
  }

  // بديل: رابط موقّع مع إجبار التنزيل
  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60, { download: safeName })

  if (signedError || !signed?.signedUrl) {
    throw error ?? signedError ?? new Error('تعذر تنزيل الملف')
  }

  const link = document.createElement('a')
  link.href = signed.signedUrl
  link.download = safeName
  document.body.appendChild(link)
  link.click()
  link.remove()
}
