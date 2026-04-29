import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import AlertsDashboardWidget from './AlertsDashboardWidget'
import ServiceCard from '../components/ServiceCard'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [services, setServices] = useState([])
  const [loadingServices, setLoadingServices] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      const response = await fetch('/api/services/services/?limit=6', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setServices(data.results || [])
      }
    } catch (err) {
      console.error('Erreur lors du chargement des services:', err)
    } finally {
      setLoadingServices(false)
    }
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <span className="dashboard-brand">CivicSense</span>
        <nav aria-label="Navigation principale">
          <ul className="nav-links">
            <li><a href="#">Accueil</a></li>
            <li><Link to="/objects">Objets</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/alerts">Alertes</Link></li>
            {['avance', 'expert'].includes(user?.level) && <li><a href="#">Gestion</a></li>}
            {user?.level === 'expert' && (
              <>
                <li><Link to="/admin/reports">Rapports</Link></li>
                <li><Link to="/admin/settings">Paramètres</Link></li>
              </>
            )}
          </ul>
        </nav>
        <button className="btn-logout" onClick={logout}>Déconnexion</button>
      </header>

      <main className="dashboard-main">
        <section aria-labelledby="welcome-title">
          <h1 id="welcome-title">Bonjour, {user?.pseudo} 👋</h1>
          <p className="level-badge">Niveau : <strong>{user?.level}</strong> — {user?.points} pts</p>
        </section>

        {['avance', 'expert'].includes(user?.level) && (
          <section aria-label="Alertes actives" style={{ marginTop: '24px' }}>
            <AlertsDashboardWidget />
          </section>
        )}

        <section aria-labelledby="services-title" style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 id="services-title" style={{ margin: 0 }}>Services disponibles</h2>
            <Link to="/services" style={{ fontSize: '13px', color: '#007bff', textDecoration: 'none' }}>Voir tous les services →</Link>
          </div>
          {loadingServices ? (
            <p style={{ color: '#999' }}>Chargement des services...</p>
          ) : services.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun service disponible pour le moment.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="dashboard-footer">
        <p>© 2025 CivicSense — Projet ING1</p>
      </footer>
    </div>
  )
}
