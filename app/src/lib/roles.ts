import type { UserRole } from '../types/database'

export const ROLE_LABELS: Record<UserRole, string> = {
  instructor: 'عضو هيئة تدريس',
  program_coordinator: 'منسق/ة برنامج',
  executive_director: 'المدير التنفيذي',
  // legacy compatibility while migrating
  admin: 'المدير التنفيذي',
}

export function homePathForRole(role: UserRole | string | null | undefined): string {
  switch (role) {
    case 'executive_director':
    case 'admin':
      return '/executive'
    case 'program_coordinator':
      return '/coordinator'
    case 'instructor':
    default:
      return '/instructor/courses'
  }
}

export function isExecutiveRole(role: UserRole | string | null | undefined): boolean {
  return role === 'executive_director' || role === 'admin'
}
