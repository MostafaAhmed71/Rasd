import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AbsencePage } from './pages/instructor/AbsencePage'
import { CoursesPage } from './pages/instructor/CoursesPage'
import { DocumentsPage } from './pages/instructor/DocumentsPage'
import { GradesPage } from './pages/instructor/GradesPage'
import { InstructorLayout } from './pages/instructor/InstructorLayout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
            <Route path="/instructor" element={<InstructorLayout />}>
              <Route index element={<Navigate to="courses" replace />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="grades" element={<GradesPage />} />
              <Route path="supervision" element={<DocumentsPage documentType="supervision" />} />
              <Route path="study" element={<DocumentsPage documentType="study" />} />
              <Route path="absence" element={<AbsencePage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
