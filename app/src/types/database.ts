export type UserRole = 'admin' | 'instructor'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Section {
  id: string
  section_number: number
  instructor_id: string | null
  instructor_name: string | null
  term: string | null
  program: string | null
  course_title: string | null
  course_code: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
}

export interface Student {
  id: string
  university_id: string
  full_name: string
  major: string | null
  course: string | null
  course_code: string | null
  type: string | null
  period: string | null
  section_id: string | null
  created_at: string
}

export interface Grade {
  student_id: string
  coursework_score: number | null
  midterm_score: number | null
  final_exam_score: number | null
  total_score: number | null
  updated_by: string | null
  updated_at: string
}

export type GradeField = keyof Omit<
  Grade,
  'student_id' | 'total_score' | 'updated_by' | 'updated_at'
>

export interface StudentWithGrade extends Student {
  grades: Grade | null
}

export const GRADE_FIELDS: {
  key: GradeField
  label: string
  labelEn?: string
  max: number
  headerBg?: string
}[] = [
  {
    key: 'coursework_score',
    label: 'مجموع أعمال السنة',
    max: 40,
    headerBg: 'bg-yellow-300',
  },
  {
    key: 'midterm_score',
    label: 'الاختبار النصفي',
    max: 20,
    headerBg: 'bg-sky-200',
  },
  {
    key: 'final_exam_score',
    label: 'الاختبار النهائي',
    max: 40,
    headerBg: 'bg-orange-200',
  },
]

export interface ImportRow {
  university_id: string
  full_name: string
  major?: string
  course?: string
  course_code?: string
  type?: string
  period?: string
  instructor_name?: string
  section_number: number
}

/** أعمدة ملف الاستيراد بالترتيب (كما في الشيت الأصلي) */
export const IMPORT_COLUMNS = [
  'اسم الطالب',
  'الرقم الجامعي',
  'التخصص',
  'المقرر',
  'النوع',
  'الفترة',
  'اسم الدكتور',
  'الرقم المرجعي',
  'رمز المقرر',
] as const

export type DocumentType = 'supervision' | 'study'

export interface InstructorDocument {
  id: string
  instructor_id: string
  document_type: DocumentType
  file_path: string
  file_name: string
  uploaded_by: string | null
  created_at: string
}

export type AbsenceStatus = 'pending' | 'approved' | 'rejected'
export type LectureMode = 'in_person' | 'remote'
export type ApologyType = 'remote_delivery' | 'full_absence'

export interface AbsenceRequest {
  id: string
  instructor_id: string
  college: string | null
  status: AbsenceStatus
  admin_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
  absence_request_lectures?: AbsenceRequestLecture[]
}

export interface AbsenceRequestLecture {
  id: string
  request_id: string
  row_order: number
  course_name: string
  section_number: string | null
  course_code: string | null
  lecture_date: string
  lecture_time: string
  lecture_mode: LectureMode
  apology_type: ApologyType
  created_at: string
}

export interface AbsenceLectureInput {
  course_name: string
  section_number: string
  course_code: string
  lecture_date: string
  lecture_time: string
  lecture_mode: LectureMode
  apology_type: ApologyType
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  supervision: 'جدول المراقبة',
  study: 'جدول عضو هيئة التدريس',
}

export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

export const LECTURE_MODE_LABELS: Record<LectureMode, string> = {
  in_person: 'حضوري',
  remote: 'عن بُعد',
}

export const APOLOGY_TYPE_LABELS: Record<ApologyType, string> = {
  remote_delivery: 'تقديم المحاضرة عن بُعد',
  full_absence: 'الاعتذار عن المحاضرة نهائياً',
}
