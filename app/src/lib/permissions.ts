/**
 * مصفوفة الصلاحيات الرسمية — المرجع الوحيد للأدوار
 *
 * | الوظيفة              | عضو تدريس      | منسق برنامج           | المدير التنفيذي        |
 * |--------------------|----------------|----------------------|------------------------|
 * | رصد الدرجات         | إدخال فقط      | عرض وتعديل           | تقارير مجمّعة          |
 * | طلبات الاعتذار      | إرسال طلب      | قبول / رفض           | عرض إحصائيات           |
 * | الجداول             | عرض فقط        | رفع وتعديل           | رفع وتعديل             |
 * | نطاق الرؤية         | مقرراته        | أعضاء برنامجه فقط    | كل البرامج             |
 * | إدارة المستخدمين    | —              | أعضاء برنامجه        | كل المنسقين والأعضاء   |
 * | التقارير            | —              | تقارير البرنامج      | تقرير شامل + تصدير     |
 */

import type { UserRole } from '../types/database'
import { isExecutiveRole } from './roles'

export type Permission =
  | 'grades.enter'
  | 'grades.edit_program'
  | 'grades.view_aggregate'
  | 'absence.send'
  | 'absence.review'
  | 'absence.view_stats'
  | 'schedule.view'
  | 'schedule.upload'
  | 'users.manage_program'
  | 'users.manage_all'
  | 'reports.program'
  | 'reports.college'
  | 'reports.export'

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  instructor: [
    'grades.enter',
    'absence.send',
    'schedule.view',
  ],
  program_coordinator: [
    'grades.enter',
    'grades.edit_program',
    'absence.send',
    'absence.review',
    'schedule.view',
    'schedule.upload',
    'users.manage_program',
    'reports.program',
  ],
  executive_director: [
    'grades.view_aggregate',
    'absence.view_stats',
    'schedule.view',
    'schedule.upload',
    'users.manage_all',
    'reports.college',
    'reports.export',
  ],
  admin: [
    'grades.view_aggregate',
    'absence.view_stats',
    'schedule.view',
    'schedule.upload',
    'users.manage_all',
    'reports.college',
    'reports.export',
  ],
}

export function can(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role) return false
  if (isExecutiveRole(role) && ROLE_PERMISSIONS.executive_director.includes(permission)) {
    return true
  }
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
