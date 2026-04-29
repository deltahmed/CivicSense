import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <span className="dashboard-brand">CivicSense</span>
        <nav aria-label="Navigation principale">
          <ul className="nav-links">
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/objects">Objets</Link></li>
            <li><a href="#">Services</a></li>
            {['avance', 'expert'].includes(user?.level) && <li><a href="#">Gestion</a></li>}
            {user?.level === 'expert' && <li><a href="#">Administration</a></li>}
          </ul>
        </nav>
        <button className="btn-logout" onClick={logout}>Déconnexion</button>
      </header>

      <main className="dashboard-main">
        <section aria-labelledby="welcome-title">
          <h1 id="welcome-title">Bonjour, {user?.pseudo} 👋</h1>
          <p className="level-badge">Niveau : <strong>{user?.level}</strong> — {user?.points} pts</p>
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>© 2025 CivicSense — Projet ING1</p>
      </footer>
    </div>
  )
}
