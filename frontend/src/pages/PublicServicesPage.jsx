import { useEffect, useState, useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { getAuthenticatedNavLinks } from '../utils/access'
import { SERVICE_CATEGORIES } from './ServicesPage'
import './PublicStatsPage.css'
import './PublicServicesPage.css'

const AUDIENCE_FILTERS = [
  { key: 'all', label: 'Tout le monde' },
  { key: 'residents', label: 'Résidents' },
  { key: 'syndic', label: 'Syndic' },
]

const PUBLIC_CONCERNE_LABELS = {
  tout_le_monde: 'Tout le monde',
  residents: 'Résidents',
  visiteurs: 'Visiteurs',
  syndic: 'Syndic',
}

const AUDIENCE_LABELS = AUDIENCE_FILTERS.reduce((acc, audience) => {
  acc[audience.key] = audience.label
  return acc
}, {})

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PublicServicesPage() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen]         = useState(false)
  const [query, setQuery]               = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeAudience, setActiveAudience]   = useState('all')
  const [hasSearched, setHasSearched]   = useState(false)
  const [services, setServices]         = useState([])

  const navLinks = user ? getAuthenticatedNavLinks(user) : []

  const categoryOptions = useMemo(() => {
    const counts = services.reduce((acc, item) => {
      if (item.categorie) acc[item.categorie] = (acc[item.categorie] ?? 0) + 1
      return acc
    }, {})
    return SERVICE_CATEGORIES.filter(cat => (counts[cat.key] ?? 0) > 0)
  }, [services])

  const levelOptions = useMemo(() => {
    const counts = services.reduce((acc, item) => {
      if (item.public_concerne) acc[item.public_concerne] = (acc[item.public_concerne] ?? 0) + 1
      return acc
    }, {})
    return AUDIENCE_FILTERS.filter(audience => audience.key === 'all' || (counts[audience.key] ?? 0) > 0)
  }, [services])

  useEffect(() => {
    document.title = 'SmartResi — Services & informations'
    api.get('/services/')
      .then(r => setServices(r.data?.data ?? []))
      .catch(() => {})
  }, [])

  // ── Filtrage ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()
    return services.filter(item => {
      if (activeCategory !== 'all' && item.categorie !== activeCategory) return false
      if (activeAudience !== 'all' && item.public_concerne !== activeAudience) return false
      if (!searchTerm) return true
      return (
        item.nom.toLowerCase().includes(searchTerm)
        || item.description?.toLowerCase().includes(searchTerm)
        || item.categorie.toLowerCase().includes(searchTerm)
        || item.public_concerne.toLowerCase().includes(searchTerm)
      )
    })
  }, [services, activeCategory, activeAudience, query])

  function runSearch() { setHasSearched(true) }
  function handleKeyDown(e) { if (e.key === 'Enter') runSearch() }
  function handleFilterChange() {
    setHasSearched(true)
  }

  return (
    <div className="ps-page">
      <div className="ps-orb ps-orb-a" aria-hidden="true" />
      <div className="ps-orb ps-orb-b" aria-hidden="true" />

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="ps-navbar">
        <div className="ps-navbar-inner">
          <Link to="/" className="ps-navbar-logo" aria-label="SmartResi — Accueil">
            <span className="ps-logo-mark" aria-hidden="true" />
            <span className="ps-logo-text">SmartResi</span>
          </Link>

          {user ? (
            <>
              <nav className={`ps-navbar-nav${menuOpen ? ' ps-nav-open' : ''}`} aria-label="Navigation">
                <ul role="list">
                  {navLinks.map(l => (
                    <li key={l.to}>
                      <NavLink
                        to={l.to}
                        className={({ isActive }) => `ps-nav-link${isActive ? ' ps-nav-link-active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {l.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ps-navbar-end">
                <span className="ps-navbar-pseudo" title={`Niveau : ${user.level}`}>
                  <span className="ps-navbar-avatar">{user.pseudo?.charAt(0).toUpperCase()}</span>
                  <span className="ps-navbar-pseudo-text">{user.pseudo}</span>
                </span>
                <button className="ps-navbar-logout" onClick={logout}>Déconnexion</button>
                <button
                  className={`ps-hamburger${menuOpen ? ' ps-hamburger-open' : ''}`}
                  onClick={() => setMenuOpen(v => !v)}
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                >
                  <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <nav className="ps-navbar-public-links" aria-label="Navigation publique">
                <Link className="ps-nav-link" to="/">Accueil</Link>
                <Link className="ps-nav-link" to="/public/services">Services &amp; informations</Link>
              </nav>
              <div className="ps-navbar-visitor">
                <Link className="ps-navbar-link" to="/login">Se connecter</Link>
                <Link className="ps-btn-primary ps-btn-sm" to="/register">S'inscrire</Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── CONTENU ───────────────────────────────────────────────────────── */}
      <main className="ps-main psv-main">

        <div className="psv-top">
          <Link to="/" className="psv-back-link">← Accueil</Link>
          <h1 className="psv-page-title">Services &amp; informations</h1>

          {/* Barre de recherche */}
          <div className="psv-search-row" role="search">
            <input
              type="search"
              className="psv-search-input"
              placeholder="Espaces communs, agenda, collectes, services…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Recherche dans les services"
            />
            {query && (
              <button
                className="psv-clear-btn"
                onClick={() => { setQuery(''); setHasSearched(false) }}
                aria-label="Effacer"
              >
                ✕
              </button>
            )}
            <button className="psv-search-btn" onClick={runSearch}>
              Rechercher
            </button>
          </div>

          {/* Filtres dynamiques */}
          <div className="psv-filter-row" role="group" aria-label="Filtres des services">
            <label className="psv-filter-control">
              <span>Catégorie</span>
              <select
                value={activeCategory}
                onChange={e => { setActiveCategory(e.target.value); handleFilterChange() }}
                className="psv-filter-select"
              >
                <option value="all">Toutes les catégories</option>
                {categoryOptions.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </label>

            <label className="psv-filter-control">
              <span>Public concerné</span>
              <select
                value={activeAudience}
                onChange={e => { setActiveAudience(e.target.value); handleFilterChange() }}
                className="psv-filter-select"
              >
                {levelOptions.map(audience => (
                  <option key={audience.key} value={audience.key}>{audience.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Résultats */}
        {!hasSearched ? (
          <p className="psv-idle">Utilisez la barre de recherche ou sélectionnez un filtre pour afficher les résultats.</p>
        ) : filtered.length === 0 ? (
          <div className="ps-search-empty">
            <p>Aucun résultat pour cette recherche.</p>
          </div>
        ) : (
          <ul className="ps-results-grid" role="list">
            {filtered.map(item => (
              <li key={item.id} className="ps-result-card ps-result-service">
                <span className="ps-result-type">Service</span>
                <p className="ps-result-titre">{item.nom}</p>
                {item.description && <p className="ps-result-detail">{item.description}</p>}
                <span className="ps-result-badge ps-result-badge-muted">{item.categorie}</span>
                <span className="ps-result-badge ps-result-badge-primary">{PUBLIC_CONCERNE_LABELS[item.public_concerne] ?? item.public_concerne}</span>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="ps-footer">
        <p>© 2026 SmartResi — Portail résidentiel</p>
      </footer>
    </div>
  )
}
