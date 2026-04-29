import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/DashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminPendingUsersPage from './pages/AdminPendingUsersPage'
import AdminMaintenancePage from './pages/AdminMaintenancePage'
import PublicStatsPage from './pages/PublicStatsPage'
import AlertsPage from './pages/AlertsPage'
import AdminReportsPage from './pages/AdminReportsPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import ObjectListPage from './pages/ObjectListPage'
import ObjectDetailPage from './pages/ObjectDetailPage'
import ProfilePage from './pages/ProfilePage'
import AdminPendingUsersPage from './pages/AdminPendingUsersPage'
import SearchPage from './pages/SearchPage'

const LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']

function ProtectedRoute({ children, minLevel = null }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (minLevel) {
    const userIdx = LEVEL_ORDER.indexOf(user.level)
    const minIdx = LEVEL_ORDER.indexOf(minLevel)
    if (userIdx < minIdx) return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicStatsPage />} />
      <Route path="/public/stats" element={<PublicStatsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Tous les utilisateurs connectés */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ExpertRoute>
            <AdminUsersPage />
          </ExpertRoute>
        }
      />
      <Route
        path="/admin/pending"
        element={
          <ExpertRoute>
            <AdminPendingUsersPage />
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
        element={<ProtectedRoute><ObjectListPage /></ProtectedRoute>}
      />
      <Route
        path="/objects/:id"
        element={<ProtectedRoute><ObjectDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/alerts"
        element={<ProtectedRoute><AlertsPage /></ProtectedRoute>}
      />

      {/* Avancé et supérieur */}
      <Route
        path="/gestion"
        element={<ProtectedRoute minLevel="avance"><ObjectListPage /></ProtectedRoute>}
      />

      {/* Expert uniquement */}
      <Route
        path="/admin"
        element={<ProtectedRoute minLevel="expert"><Navigate to="/admin/users" replace /></ProtectedRoute>}
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute minLevel="expert"><AdminUsersPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/maintenance"
        element={<ProtectedRoute minLevel="expert"><AdminMaintenancePage /></ProtectedRoute>}
      />
      <Route
        path="/admin/reports"
        element={<ProtectedRoute minLevel="expert"><AdminReportsPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/settings"
        element={<ProtectedRoute minLevel="expert"><AdminSettingsPage /></ProtectedRoute>}
      />

      {/* Catch-all */}
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/pending"
        element={
          <ExpertRoute>
            <AdminPendingUsersPage />
          </ExpertRoute>
        }
      />
      <Route path="/search" element={<SearchPage />} />
      <Route
        path="/*"
        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
      />
    </Routes>
  )
}
