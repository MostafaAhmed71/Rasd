import { AppShell, type NavItem } from '../../components/AppShell'

const NAV: NavItem[] = [
  { to: '/coordinator', label: 'أعضاء برنامجي', end: true },
  { to: '/coordinator/absence', label: 'طلبات الاعتذار' },
]

export function CoordinatorLayout() {
  return <AppShell title="لوحة منسق البرنامج" navItems={NAV} />
}
