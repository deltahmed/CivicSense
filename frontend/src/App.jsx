import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminPendingUsersPage = lazy(() => import('./pages/AdminPendingUsersPage'))
const AdminMaintenancePage = lazy(() => import('./pages/AdminMaintenancePage'))
const PublicStatsPage = lazy(() => import('./pages/PublicStatsPage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'))
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'))
const ObjectListPage = lazy(() => import('./pages/ObjectListPage'))
const ObjectDetailPage = lazy(() => import('./pages/ObjectDetailPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const PublicUsersPage = lazy(() => import('./pages/PublicUsersPage'))
const PublicUserDetailPage = lazy(() => import('./pages/PublicUserDetailPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'))
const GestionAccesPage = lazy(() => import('./pages/GestionAccesPage'))
const ConsoEnergiePage = lazy(() => import('./pages/ConsoEnergiePage'))
const ConsoEauPage = lazy(() => import('./pages/ConsoEauPage'))
const GestionDechetsPage = lazy(() => import('./pages/GestionDechetsPage'))
const ObjectAddPage = lazy(() => import('./pages/ObjectAddPage'))
const AdminDeletionsPage = lazy(() => import('./pages/AdminDeletionsPage'))

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
    <Suspense fallback={<div className="page-loading">Chargement…</div>}>
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
        <Route path="/services"          element={<ProtectedLayout><ServicesPage /></ProtectedLayout>} />
        <Route path="/services/acces"    element={<ProtectedLayout><GestionAccesPage /></ProtectedLayout>} />
        <Route path="/services/energie"  element={<ProtectedLayout><ConsoEnergiePage /></ProtectedLayout>} />
        <Route path="/services/eau"      element={<ProtectedLayout><ConsoEauPage /></ProtectedLayout>} />
        <Route path="/services/dechets"  element={<ProtectedLayout><GestionDechetsPage /></ProtectedLayout>} />
        <Route path="/services/:id"      element={<ProtectedLayout><ServiceDetailPage /></ProtectedLayout>} />
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
    </Suspense>
  )
}
