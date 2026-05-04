import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAuthenticatedNavLinks } from '../utils/access'
import './PublicStatsPage.css'
import './PublicServicesPage.css'

// ── Données statiques ─────────────────────────────────────────────────────────
const ESPACES_COMMUNS = [
  { nom: 'Salle de réunion',  statut: 'Disponible',       cls: 'success' },
  { nom: 'Buanderie bât. A',  statut: 'Occupée',           cls: 'error'   },
  { nom: 'Buanderie bât. B',  statut: 'Disponible',        cls: 'success' },
  { nom: 'Parking visiteurs', statut: '3 places libres',   cls: 'success' },
  { nom: 'Consigne à vélos',  statut: '2/10 vélos dispo',  cls: 'warning' },
]

const AGENDA_EVENTS = [
  { titre: 'Entretien chaudière bât. A & B',         date: '2026-05-08', cls: 'travaux' },
  { titre: 'Assemblée générale des copropriétaires', date: '2026-05-15', cls: 'reunion' },
  { titre: 'Permanence syndic',                      date: '2026-05-20', cls: 'reunion' },
  { titre: 'Journée tri sélectif & éco-gestes',     date: '2026-05-22', cls: 'service' },
]

const COLLECTE_SCHEDULE = [
  { type: 'Ordures ménagères', dayOfWeek: [1, 4] },
  { type: 'Tri sélectif',      dayOfWeek: [2]    },
  { type: 'Verre',             dayOfWeek: null    },
  { type: 'Encombrants',       dayOfWeek: null    },
]

const FILTER_OPTIONS = [
  { key: 'all',      label: 'Tout'            },
  { key: 'espace',   label: 'Espaces communs' },
  { key: 'agenda',   label: 'Agenda'          },
  { key: 'collecte', label: 'Collectes'       },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtAgendaDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function getNextOccurrence(dayOfWeek) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (dayOfWeek - today.getDay() + 7) % 7 || 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function buildItems() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const espaceItems = ESPACES_COMMUNS.map((e, i) => ({
    id:        `espace-${i}`,
    type:      'espace',
    typeLabel: 'Espaces communs',
    titre:     e.nom,
    detail:    null,
    badgeText: e.statut,
    badgeCls:  e.cls,
  }))

  const agendaItems = AGENDA_EVENTS
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e, i) => ({
      id:        `agenda-${i}`,
      type:      'agenda',
      typeLabel: 'Agenda',
      titre:     e.titre,
      detail:    fmtAgendaDate(e.date),
      badgeText: null,
      badgeCls:  null,
    }))

  const collecteItems = COLLECTE_SCHEDULE.map((c, i) => ({
    id:        `collecte-${i}`,
    type:      'collecte',
    typeLabel: 'Collectes',
    titre:     c.type,
    detail:    c.dayOfWeek
      ? c.dayOfWeek.map(d => getNextOccurrence(d)).join(' & ')
      : 'Sur demande à la loge',
    badgeText: null,
    badgeCls:  null,
  }))

  return [...espaceItems, ...agendaItems, ...collecteItems]
}

const ALL_ITEMS = buildItems()

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PublicServicesPage() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen]           = useState(false)
  const [query, setQuery]                 = useState('')
  const [activeFilter, setActiveFilter]   = useState('all')
  const [hasSearched, setHasSearched]     = useState(false)

  const navLinks = user ? getAuthenticatedNavLinks(user) : []

  useEffect(() => { document.title = 'CivicSense — Services & informations' }, [])

  function runSearch() {
    setHasSearched(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') runSearch()
  }

  function handleFilterChange(key) {
    setActiveFilter(key)
    if (hasSearched) return
    setHasSearched(true)
  }

  const filtered = ALL_ITEMS.filter(item => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return item.titre.toLowerCase().includes(q) || item.detail?.toLowerCase().includes(q)
  })

  const counts = FILTER_OPTIONS.reduce((acc, f) => {
    acc[f.key] = f.key === 'all'
      ? ALL_ITEMS.length
      : ALL_ITEMS.filter(i => i.type === f.key).length
    return acc
  }, {})

  return (
    <div className="ps-page">
      <div className="ps-orb ps-orb-a" aria-hidden="true" />
      <div className="ps-orb ps-orb-b" aria-hidden="true" />

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="ps-navbar">
        <div className="ps-navbar-inner">
          <Link to="/" className="ps-navbar-logo" aria-label="CivicSense — Accueil">
            <span className="ps-logo-mark" aria-hidden="true" />
            <span className="ps-logo-text">CivicSense</span>
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

          {/* Barre de recherche + bouton */}
          <div className="psv-search-row" role="search">
            <input
              type="search"
              className="psv-search-input"
              placeholder="Espaces communs, agenda, collectes…"
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

          {/* Filtres */}
          <div className="ps-filter-bar" role="group" aria-label="Filtres par catégorie">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                className={`ps-filter-chip${activeFilter === f.key ? ' ps-filter-chip--active' : ''}`}
                onClick={() => handleFilterChange(f.key)}
                aria-pressed={activeFilter === f.key}
              >
                {f.label}
                <span className="ps-filter-count">{counts[f.key]}</span>
              </button>
            ))}
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
              <li key={item.id} className={`ps-result-card ps-result-${item.type}`}>
                <span className="ps-result-type">{item.typeLabel}</span>
                <p className="ps-result-titre">{item.titre}</p>
                {item.detail && <p className="ps-result-detail">{item.detail}</p>}
                {item.badgeText && (
                  <span className={`ps-result-badge ps-result-badge-${item.badgeCls}`}>{item.badgeText}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="ps-footer">
        <p>© 2026 CivicSense — Portail résidentiel</p>
      </footer>
    </div>
  )
}
