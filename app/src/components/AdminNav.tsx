type AdminTab = 'data' | 'courses' | 'documents' | 'absence'

interface AdminNavProps {
  active: AdminTab
  onChange: (tab: AdminTab) => void
}

const tabs: { id: AdminTab; label: string }[] = [
  { id: 'data', label: 'البيانات والدرجات' },
  { id: 'courses', label: 'المواد' },
  { id: 'documents', label: 'المستندات' },
  { id: 'absence', label: 'طلبات الاعتذار' },
]

export function AdminNav({ active, onChange }: AdminNavProps) {
  return (
    <nav className="nav-tabs animate-fade-up" aria-label="أقسام لوحة المسؤول">
      <p className="sidebar-title">القائمة</p>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`nav-tab ${active === tab.id ? 'nav-tab-active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
