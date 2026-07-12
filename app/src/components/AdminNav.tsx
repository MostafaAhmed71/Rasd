type AdminTab = 'data' | 'courses' | 'documents'

interface AdminNavProps {
  active: AdminTab
  onChange: (tab: AdminTab) => void
}

const tabs: { id: AdminTab; label: string }[] = [
  { id: 'data', label: 'البيانات والدرجات' },
  { id: 'courses', label: 'المواد' },
  { id: 'documents', label: 'المستندات / الجداول' },
]

export function AdminNav({ active, onChange }: AdminNavProps) {
  return (
    <nav className="nav-tabs animate-fade-up" aria-label="أقسام إدارة النظام">
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

export type { AdminTab }
