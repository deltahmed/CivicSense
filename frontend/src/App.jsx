import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminMaintenancePage from './pages/AdminMaintenancePage'
import PublicStatsPage from './pages/PublicStatsPage'
import AlertsPage from './pages/AlertsPage'
import AdminReportsPage from './pages/AdminReportsPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import ObjectListPage from './pages/ObjectListPage'
import ObjectDetailPage from './pages/ObjectDetailPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

function ExpertRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.level !== 'expert') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicStatsPage />} />
      <Route path="/public/stats" element={<PublicStatsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/admin/users"
        element={
          <ExpertRoute>
            <AdminUsersPage />
          </ExpertRoute>
        }
      />
      <Route
        path="/admin/maintenance"
        element={
          <ExpertRoute>
            <AdminMaintenancePage />
          </ExpertRoute>
        }
      />
      <Route
        path="/objects"
        element={
          <PrivateRoute>
            <ObjectListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/objects/:id"
        element={
          <PrivateRoute>
            <ObjectDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <PrivateRoute>
            <AlertsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ExpertRoute>
            <AdminReportsPage />
          </ExpertRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ExpertRoute>
            <AdminSettingsPage />
          </ExpertRoute>
        }
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
