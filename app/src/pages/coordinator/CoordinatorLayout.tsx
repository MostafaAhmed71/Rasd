import { AppShell, type NavItem } from '../../components/AppShell'

const NAV: NavItem[] = [
  { to: '/coordinator', label: 'أعضاء برنامجي', end: true },
  { to: '/coordinator/grades', label: 'رصد الدرجات' },
  { to: '/coordinator/absence', label: 'طلبات الاعتذار' },
  { to: '/coordinator/documents', label: 'الجداول' },
  { to: '/coordinator/reports', label: 'تقارير البرنامج' },
]

export function CoordinatorLayout() {
  return <AppShell title="لوحة منسق البرنامج" navItems={NAV} />
}
