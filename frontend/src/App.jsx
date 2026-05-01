import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
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
import SearchPage from './pages/SearchPage'
import PublicUsersPage from './pages/PublicUsersPage'
import PublicUserDetailPage from './pages/PublicUserDetailPage'
import ServicesPage from './pages/ServicesPage'
import ServiceDetailPage from './pages/ServiceDetailPage'
import ObjectAddPage from './pages/ObjectAddPage'
import AdminDeletionsPage from './pages/AdminDeletionsPage'

const LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']

function ProtectedLayout({ children, minLevel = null }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Chargement…</div>
  if (!user) return <Navigate to="/login" replace />
  if (minLevel) {
    const userIdx = LEVEL_ORDER.indexOf(user.level)
    const minIdx = LEVEL_ORDER.indexOf(minLevel)
    if (userIdx < minIdx) return <Navigate to="/dashboard" replace />
  }
  return <AppLayout>{children}</AppLayout>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicStatsPage />} />
      <Route path="/public/stats" element={<PublicStatsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authentifié — tous niveaux */}
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/profile"   element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
      <Route path="/users"     element={<ProtectedLayout><PublicUsersPage /></ProtectedLayout>} />
      <Route path="/users/:id" element={<ProtectedLayout><PublicUserDetailPage /></ProtectedLayout>} />
      <Route path="/services"     element={<ProtectedLayout><ServicesPage /></ProtectedLayout>} />
      <Route path="/services/:id" element={<ProtectedLayout><ServiceDetailPage /></ProtectedLayout>} />
      <Route path="/objects"      element={<ProtectedLayout><ObjectListPage /></ProtectedLayout>} />
      <Route path="/objects/new"  element={<ProtectedLayout minLevel="avance"><ObjectAddPage /></ProtectedLayout>} />
      <Route path="/objects/:id"  element={<ProtectedLayout><ObjectDetailPage /></ProtectedLayout>} />
      <Route path="/alerts" element={<ProtectedLayout minLevel="expert"><AlertsPage /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />


      {/* Expert uniquement */}
      <Route path="/admin" element={<ProtectedLayout minLevel="expert"><Navigate to="/admin/users" replace /></ProtectedLayout>} />
      <Route path="/admin/users"       element={<ProtectedLayout minLevel="expert"><AdminUsersPage /></ProtectedLayout>} />
      <Route path="/admin/pending"     element={<ProtectedLayout minLevel="expert"><AdminPendingUsersPage /></ProtectedLayout>} />
      <Route path="/admin/maintenance" element={<ProtectedLayout minLevel="expert"><AdminMaintenancePage /></ProtectedLayout>} />
      <Route path="/admin/reports"     element={<ProtectedLayout minLevel="expert"><AdminReportsPage /></ProtectedLayout>} />
      <Route path="/admin/settings"    element={<ProtectedLayout minLevel="expert"><AdminSettingsPage /></ProtectedLayout>} />
      <Route path="/admin/deletions"   element={<ProtectedLayout minLevel="expert"><AdminDeletionsPage /></ProtectedLayout>} />

      {/* Catch-all */}
      <Route path="/*" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
    </Routes>
  )
}
