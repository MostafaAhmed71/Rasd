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

/** اسم عضو التدريس من بيانات الشعب (عمود الاستيراد) وليس اسم الحساب */
export function getInstructorNameFromSections(
  sections: Section[],
  fallback?: string | null,
): string {
  const names = sections
    .map((s) => s.instructor_name?.trim())
    .filter((n): n is string => !!n)

  if (names.length === 0) return fallback?.trim() || 'غير محدد'

  const counts = new Map<string, number>()
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  let best = names[0]
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return best
}
