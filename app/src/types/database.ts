export type UserRole =
  | 'instructor'
  | 'program_coordinator'
  | 'executive_director'
  | 'admin' // legacy — treated as executive_director

export type CourseType = 'regular' | 'field_training'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Program {
  id: string
  name: string
  coordinator_id: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
}

export interface Section {
  id: string
  section_number: number
  instructor_id: string | null
  instructor_name: string | null
  term: string | null
  program: string | null
  program_id: string | null
  course_title: string | null
  course_code: string | null
  course_type: CourseType | null
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
  field_supervisor_score: number | null
  academic_supervisor_score: number | null
  platform_course_1: number | null
  platform_course_2: number | null
  platform_course_3: number | null
  platform_course_4: number | null
  report_writing_score: number | null
  report_discussion_score: number | null
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

export const REGULAR_GRADE_FIELDS: {
  key: GradeField
  label: string
  max: number
}[] = [
  { key: 'coursework_score', label: 'أعمال السنة', max: 40 },
  { key: 'midterm_score', label: 'نصفي', max: 20 },
  { key: 'final_exam_score', label: 'نهائي', max: 40 },
]

export const FIELD_TRAINING_GRADE_FIELDS: {
  key: GradeField
  label: string
  max: number
}[] = [
  { key: 'field_supervisor_score', label: 'المشرف الميداني', max: 40 },
  { key: 'academic_supervisor_score', label: 'المشرف الأكاديمي', max: 10 },
  { key: 'platform_course_1', label: 'دورة 1', max: 5 },
  { key: 'platform_course_2', label: 'دورة 2', max: 5 },
  { key: 'platform_course_3', label: 'دورة 3', max: 5 },
  { key: 'platform_course_4', label: 'دورة 4', max: 5 },
  { key: 'report_writing_score', label: 'كتابة التقرير', max: 20 },
  { key: 'report_discussion_score', label: 'مناقشة التقرير', max: 10 },
]

/** @deprecated use REGULAR_GRADE_FIELDS or getGradeFields(courseType) */
export const GRADE_FIELDS = REGULAR_GRADE_FIELDS

export function getGradeFields(courseType: CourseType | null | undefined) {
  return courseType === 'field_training' ? FIELD_TRAINING_GRADE_FIELDS : REGULAR_GRADE_FIELDS
}

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
export type ScheduleType = 'study' | 'supervision'

export interface InstructorDocument {
  id: string
  instructor_id: string
  document_type: DocumentType
  file_path: string
  file_name: string
  uploaded_by: string | null
  created_at: string
}

export interface ScheduleEntry {
  id: string
  instructor_id: string
  schedule_type: ScheduleType
  day_label: string | null
  entry_date: string | null
  time_label: string | null
  room: string | null
  course_code: string | null
  course_title: string | null
  section_number: string | null
  units: string | null
  workload: string | null
  first_proctor: string | null
  second_proctor: string | null
  source_file_name: string | null
  uploaded_at: string | null
  created_at: string
}

export interface GeneralTask {
  id: string
  instructor_id: string
  title: string
  is_done: boolean
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
  full_absence: 'الاعتذار نهائيًا',
}

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  regular: 'مقرر عادي',
  field_training: 'تدريب ميداني',
}
