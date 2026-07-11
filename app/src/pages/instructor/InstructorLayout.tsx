import { AppShell, type NavItem } from '../../components/AppShell'

const NAV: NavItem[] = [
  { to: '/instructor/courses', label: 'المواد الدراسية' },
  { to: '/instructor/grades', label: 'رصد الدرجات' },
  { to: '/instructor/study', label: 'جدول عضو هيئة التدريس' },
  { to: '/instructor/supervision', label: 'جدول المراقبة' },
  { to: '/instructor/absence', label: 'تقديم طلب اعتذار' },
  { to: '/instructor/tasks', label: 'مهام أخرى' },
]

export function InstructorLayout() {
  return <AppShell title="المواد الدراسية" navItems={NAV} />
}
