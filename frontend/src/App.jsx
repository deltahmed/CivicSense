import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage      from './pages/HomePage';
import LoginPage     from './pages/LoginPage';
import RegisterPage  from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPanel    from './pages/AdminPanel';
import NotFoundPage  from './pages/NotFoundPage';

const LEVELS = ['débutant', 'intermédiaire', 'avancé', 'expert'];

function PrivateRoute({ children, minLevel }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;

  if (minLevel && LEVELS.indexOf(user.level) < LEVELS.indexOf(minLevel)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute minLevel="expert">
                <AdminPanel />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
