import { AppShell, type NavItem } from '../../components/AppShell'

const NAV: NavItem[] = [
  { to: '/executive', label: 'نظرة عامة', end: true },
  { to: '/executive/programs', label: 'البرامج والمنسقون' },
  { to: '/executive/absence-stats', label: 'إحصائيات الاعتذار' },
  { to: '/executive/manage', label: 'إدارة النظام' },
]

export function ExecutiveLayout() {
  return <AppShell title="لوحة المدير التنفيذي" navItems={NAV} />
}
