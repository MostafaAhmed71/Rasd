import type { Profile, Section } from '../types/database'

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function matchInstructorId(
  name: string | undefined,
  instructors: Profile[],
): string | null {
  if (!name?.trim()) return null
  const normalized = normalizeName(name)
  const match = instructors.find(
    (instructor) =>
      instructor.full_name && normalizeName(instructor.full_name) === normalized,
  )
  return match?.id ?? null
}

export function getSectionInstructorName(
  section: Section & { profiles?: { full_name: string | null } | null },
): string {
  return section.instructor_name ?? section.profiles?.full_name ?? 'غير محدد'
}
