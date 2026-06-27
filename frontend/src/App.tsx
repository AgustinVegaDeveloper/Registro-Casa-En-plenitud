import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { AttendancePage } from './pages/AttendancePage'
import { CellDetailPage } from './pages/CellDetailPage'
import { CellsPage } from './pages/CellsPage'
import { MemberDetailPage } from './pages/MemberDetailPage'
import { MembersPage } from './pages/MembersPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReportsPage } from './pages/ReportsPage'
import { SupportPage } from './pages/SupportPage'
import { NetworksPage } from './pages/NetworksPage'
import { UsersPage } from './pages/UsersPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="networks" element={<NetworksPage />} />
        <Route path="cells" element={<CellsPage />} />
        <Route path="cells/:cellId" element={<CellDetailPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:memberId" element={<MemberDetailPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
