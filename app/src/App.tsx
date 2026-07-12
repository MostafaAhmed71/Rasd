import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TrialGate } from './components/TrialGate'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AbsencePage } from './pages/instructor/AbsencePage'
import { CoursesPage } from './pages/instructor/CoursesPage'
import { GradesPage } from './pages/instructor/GradesPage'
import { InstructorLayout } from './pages/instructor/InstructorLayout'
import { TasksPage } from './pages/instructor/TasksPage'
import { SchedulePage } from './pages/instructor/SchedulePage'
import { CoordinatorLayout } from './pages/coordinator/CoordinatorLayout'
import { CoordinatorMembersPage } from './pages/coordinator/CoordinatorMembersPage'
import { CoordinatorAbsencePage } from './pages/coordinator/CoordinatorAbsencePage'
import { CoordinatorDocumentsPage } from './pages/coordinator/CoordinatorDocumentsPage'
import { CoordinatorReportsPage } from './pages/coordinator/CoordinatorReportsPage'
import { ExecutiveLayout } from './pages/executive/ExecutiveLayout'
import { ExecutiveOverviewPage } from './pages/executive/ExecutiveOverviewPage'
import { ExecutiveProgramsPage } from './pages/executive/ExecutiveProgramsPage'
import { ExecutiveAbsenceStatsPage } from './pages/executive/ExecutiveAbsenceStatsPage'
import { AdminDashboard } from './pages/AdminDashboard'

function App() {
  return (
    <TrialGate>
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
                <Route path="study" element={<SchedulePage scheduleType="study" />} />
                <Route path="supervision" element={<SchedulePage scheduleType="supervision" />} />
                <Route path="absence" element={<AbsencePage />} />
                <Route path="tasks" element={<TasksPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['program_coordinator']} />}>
              <Route path="/coordinator" element={<CoordinatorLayout />}>
                <Route index element={<CoordinatorMembersPage />} />
                <Route path="grades" element={<GradesPage />} />
                <Route path="absence" element={<CoordinatorAbsencePage />} />
                <Route path="documents" element={<CoordinatorDocumentsPage />} />
                <Route path="reports" element={<CoordinatorReportsPage />} />
              </Route>
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={['executive_director', 'admin']} />
              }
            >
              <Route path="/executive" element={<ExecutiveLayout />}>
                <Route index element={<ExecutiveOverviewPage />} />
                <Route path="programs" element={<ExecutiveProgramsPage />} />
                <Route path="absence-stats" element={<ExecutiveAbsenceStatsPage />} />
                <Route path="manage" element={<AdminDashboard />} />
              </Route>
            </Route>

            <Route path="/admin" element={<Navigate to="/executive/manage" replace />} />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TrialGate>
  )
}

export default App
