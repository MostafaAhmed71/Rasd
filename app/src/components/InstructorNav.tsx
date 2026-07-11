import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/instructor/courses', label: 'موادي' },
  { to: '/instructor/grades', label: 'رصد الدرجات' },
  { to: '/instructor/supervision', label: 'جدول المراقبة' },
  { to: '/instructor/study', label: 'جدول الدراسة' },
  { to: '/instructor/absence', label: 'طلب غياب' },
] as const

export function InstructorNav() {
  return (
    <nav className="nav-tabs animate-fade-up" aria-label="أقسام لوحة عضو التدريس">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `nav-tab ${isActive ? 'nav-tab-active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
