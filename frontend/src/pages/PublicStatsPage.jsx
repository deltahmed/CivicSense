import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { getAuthenticatedNavLinks } from '../utils/access'
import './PublicStatsPage.css'

// ── Météo : Open-Meteo ────────────────────────────────────────────────────────
const METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=48.8566&longitude=2.3522' +
  '&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m' +
  '&timezone=Europe%2FParis'

function wmoLabel(code) {
  if (code === 0)  return { label: 'Ciel dégagé', icon: '☀️' }
  if (code <= 2)   return { label: 'Peu nuageux',  icon: '🌤️' }
  if (code <= 3)   return { label: 'Nuageux',       icon: '☁️' }
  if (code <= 48)  return { label: 'Brouillard',   icon: '🌫️' }
  if (code <= 55)  return { label: 'Bruine',        icon: '🌦️' }
  if (code <= 65)  return { label: 'Pluie',         icon: '🌧️' }
  if (code <= 75)  return { label: 'Neige',         icon: '🌨️' }
  if (code <= 82)  return { label: 'Averses',       icon: '🌦️' }
  if (code <= 99)  return { label: 'Orage',         icon: '⛈️' }
  return { label: 'Inconnu', icon: '🌡️' }
}

// ── Qualité de l'air : Open-Meteo Air Quality ─────────────────────────────────
const AIR_URL =
  'https://air-quality-api.open-meteo.com/v1/air-quality' +
  '?latitude=48.8566&longitude=2.3522' +
  '&current=european_aqi,pm2_5,pm10' +
  '&timezone=Europe%2FParis'

function aqiInfo(aqi) {
  if (aqi <= 20) return { label: 'Bon',        cls: 'success' }
  if (aqi <= 40) return { label: 'Acceptable', cls: 'success' }
  if (aqi <= 60) return { label: 'Modéré',     cls: 'warning' }
  if (aqi <= 80) return { label: 'Médiocre',   cls: 'error'   }
  return           { label: 'Mauvais',         cls: 'error'   }
}

// ── Données statiques ─────────────────────────────────────────────────────────
const ESPACES_COMMUNS = [
  { nom: 'Salle de réunion',  icon: '🏛️', statut: 'Disponible',       cls: 'success' },
  { nom: 'Buanderie bât. A',  icon: '🧺', statut: 'Occupée',           cls: 'error'   },
  { nom: 'Buanderie bât. B',  icon: '🧺', statut: 'Disponible',        cls: 'success' },
  { nom: 'Parking visiteurs', icon: '🅿️', statut: '3 places libres',   cls: 'success' },
  { nom: 'Consigne à vélos',  icon: '🚲', statut: '2/10 vélos dispo',  cls: 'warning' },
]

const AGENDA_EVENTS = [
  { titre: 'Entretien chaudière bât. A & B',         date: '2026-05-08', icon: '🔧', cls: 'travaux' },
  { titre: 'Assemblée générale des copropriétaires', date: '2026-05-15', icon: '📋', cls: 'reunion' },
  { titre: 'Permanence syndic',                      date: '2026-05-20', icon: '🏢', cls: 'reunion' },
  { titre: 'Journée tri sélectif & éco-gestes',     date: '2026-05-22', icon: '♻️', cls: 'service' },
]

const COLLECTE_SCHEDULE = [
  { type: 'Ordures ménagères', icon: '🗑️', dayOfWeek: [1, 4] },
  { type: 'Tri sélectif',      icon: '♻️', dayOfWeek: [2]    },
  { type: 'Verre',             icon: '🍶', dayOfWeek: null    },
  { type: 'Encombrants',       icon: '📦', dayOfWeek: null    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateAnnonce(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sortByNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

// ── Composants carte ──────────────────────────────────────────────────────────
function MeteoCard() {
  const [meteo, setMeteo] = useState(null)
  const [err, setErr]     = useState(false)

  useEffect(() => {
    fetch(METEO_URL).then(r => r.json()).then(d => setMeteo(d.current)).catch(() => setErr(true))
  }, [])

  if (err)    return <div className="ps-card ps-meteo-card ps-meteo-err"><p>Météo indisponible</p></div>
  if (!meteo) return <div className="ps-card ps-meteo-card ps-meteo-loading"><span>Chargement météo…</span></div>

  const { label, icon } = wmoLabel(meteo.weathercode)
  return (
    <div className="ps-card ps-meteo-card">
      <div className="ps-meteo-header">
        <div>
          <p className="ps-section-label">Météo Paris — temps réel</p>
          <p className="ps-meteo-desc">{label}</p>
        </div>
        <span className="ps-meteo-icon" aria-hidden="true">{icon}</span>
      </div>
      <p className="ps-meteo-temp">{Math.round(meteo.temperature_2m)}°C</p>
      <div className="ps-meteo-details">
        <div className="ps-meteo-detail">
          <span className="ps-meteo-detail-label">Ressenti</span>
          <span>{Math.round(meteo.apparent_temperature)}°C</span>
        </div>
        <div className="ps-meteo-detail">
          <span className="ps-meteo-detail-label">Humidité</span>
          <span>{meteo.relative_humidity_2m} %</span>
        </div>
        <div className="ps-meteo-detail">
          <span className="ps-meteo-detail-label">Vent</span>
          <span>{Math.round(meteo.windspeed_10m)} km/h</span>
        </div>
      </div>
      <p className="ps-meteo-source">Source : Open-Meteo</p>
    </div>
  )
}

function AirQualityCard() {
  const [air, setAir] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    fetch(AIR_URL).then(r => r.json()).then(d => setAir(d.current)).catch(() => setErr(true))
  }, [])

  if (err) return (
    <div className="ps-card ps-air-card ps-air-unavail">
      <p className="ps-section-label">Qualité de l'air</p>
      <p className="ps-air-unavail-msg">Données indisponibles</p>
    </div>
  )
  if (!air) return (
    <div className="ps-card ps-air-card ps-air-loading">
      <p className="ps-section-label">Qualité de l'air</p>
      <span>Chargement…</span>
    </div>
  )

  const { label, cls } = aqiInfo(air.european_aqi)
  return (
    <div className="ps-card ps-air-card">
      <div className="ps-air-header">
        <p className="ps-section-label">Qualité de l'air — Paris</p>
        <span className={`ps-air-badge ps-air-badge-${cls}`}>{label}</span>
      </div>
      <p className={`ps-air-index ps-air-index-${cls}`}>{air.european_aqi}</p>
      <p className="ps-air-index-label">Indice européen (IQA)</p>
      <div className="ps-air-details">
        <div className="ps-air-detail">
          <span className="ps-air-detail-label">PM2.5</span>
          <span>{air.pm2_5 != null ? air.pm2_5.toFixed(1) : '—'} μg/m³</span>
        </div>
        <div className="ps-air-detail">
          <span className="ps-air-detail-label">PM10</span>
          <span>{air.pm10 != null ? air.pm10.toFixed(1) : '—'} μg/m³</span>
        </div>
      </div>
      <p className="ps-air-source">Source : Open-Meteo</p>
    </div>
  )
}


// ── Page principale ───────────────────────────────────────────────────────────
const EMPTY_STATS = { nom_residence: 'Résidence Les Lilas', score_sante: 0, objets_actifs: 0, incidents_en_cours: 0, total_objets: 0 }
const SERVICE_CATALOG = [
  { id: 'acces',   nom: 'Gestion d\'accès',       description: 'Contrôle des serrures et digicodes',  categorie: 'Accès'   },
  { id: 'energie', nom: 'Consommation d\'énergie', description: 'Suivi et optimisation électrique',    categorie: 'Énergie' },
  { id: 'eau',     nom: 'Consommation d\'eau',     description: 'Monitoring et détection de fuites',   categorie: 'Eau'     },
  { id: 'dechets', nom: 'Gestion des déchets',     description: 'Collectes et suivi des conteneurs',   categorie: 'Déchets' },
]
const SERVICE_ROUTES = { acces: '/services/acces', energie: '/services/energie', eau: '/services/eau', dechets: '/services/dechets' }

export default function PublicStatsPage() {
  const { user, logout } = useAuth()
  const [stats, setStats]               = useState(EMPTY_STATS)
  const [statsLoaded, setStatsLoaded]   = useState(false)
  const [annonces, setAnnonces]         = useState([])
  const [services, setServices]         = useState([])
  const [menuOpen, setMenuOpen]         = useState(false)
  const [mouse, setMouse]               = useState({ rx: 0, ry: 0 })

  const navLinks = user ? getAuthenticatedNavLinks(user) : []
  const visibleServices = SERVICE_CATALOG.map(s => {
    const api_ = services.find(i => i.id === s.id)
    return api_ ? { ...s, ...api_ } : s
  })

  useEffect(() => { document.title = 'CivicSense — Résidence Les Lilas' }, [])

  useEffect(() => {
    api.get('/public/stats/')
      .then(r => setStats(p => ({ ...p, ...(r.data?.data ?? {}) })))
      .catch(() => {})
      .finally(() => setStatsLoaded(true))

    api.get('/announcements/')
      .then(r => setAnnonces(sortByNewest((r.data?.data ?? []).filter(a => a.visible)).slice(0, 3)))
      .catch(() => {})

    api.get('/services/')
      .then(r => setServices(r.data?.data ?? []))
      .catch(() => {})

  }, [])

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setMouse({ rx: ((x - 50) / 50) * 1.1, ry: ((y - 50) / 50) * -1.1 })
  }

  const scoreColor = stats.score_sante >= 80 ? 'success' : stats.score_sante >= 50 ? 'warning' : 'error'

  return (
    <div className="ps-page" onMouseMove={handleMouseMove} onMouseLeave={() => setMouse({ rx: 0, ry: 0 })}>
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

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="ps-hero">
        <div
          className="ps-hero-inner"
          style={{ transform: `perspective(1000px) rotateX(${mouse.ry}deg) rotateY(${mouse.rx}deg)`, transition: 'transform .4s ease' }}
        >
          <div className="ps-hero-copy">
            <h1 className="ps-hero-title">
              Bienvenue à la<br />
              <span className="ps-hero-accent">{stats.nom_residence}</span>
            </h1>
            <p className="ps-hero-sub">12 rue des Lilas, 75020 Paris</p>
            {user && (
              <nav className="ps-hero-actions" aria-label="Accès rapide">
                <Link className="ps-btn-primary" to="/dashboard">Tableau de bord</Link>
                <Link className="ps-btn-secondary" to="/objects">Objets connectés</Link>
              </nav>
            )}
          </div>

          <aside className="ps-hero-kpis" aria-label="Indicateurs de la résidence">
            <p className="ps-section-label">Indicateurs en direct</p>
            <div className="ps-kpi-list">
              <div className={`ps-kpi ps-kpi-${scoreColor}`}>
                <span className="ps-kpi-value">{statsLoaded ? stats.score_sante : '—'}</span>
                <span className="ps-kpi-label">Score santé<span aria-hidden="true">/100</span></span>
              </div>
              <div className="ps-kpi">
                <span className="ps-kpi-value">{statsLoaded ? stats.objets_actifs : '—'}</span>
                <span className="ps-kpi-label">Objets actifs</span>
              </div>
              <div className={`ps-kpi ${stats.incidents_en_cours > 0 ? 'ps-kpi-warning' : ''}`}>
                <span className="ps-kpi-value">{statsLoaded ? stats.incidents_en_cours : '—'}</span>
                <span className="ps-kpi-label">Incidents en cours</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── CONTENU ───────────────────────────────────────────────────────── */}
      <main className="ps-main">

        {/* Infos résidence + météo + qualité de l'air */}
        <section className="ps-section" aria-labelledby="infos-title">
          <h2 id="infos-title" className="ps-section-title">Informations générales</h2>
          <div className="ps-info-grid">
            <div className="ps-card ps-info-card">
              <p className="ps-section-label">Résidence</p>
              <h3 className="ps-info-name">{stats.nom_residence}</h3>
              <ul className="ps-info-list">
                <li><span className="ps-info-icon">📍</span><span>12 rue des Lilas, 75020 Paris</span></li>
                <li><span className="ps-info-icon">🏢</span><span>3 bâtiments — 84 logements</span></li>
                <li><span className="ps-info-icon">🧑‍🤝‍🧑</span><span>Géré par le Syndic SyndCoop Île-de-France</span></li>
                <li><span className="ps-info-icon">📞</span><span>Loge : 01 43 55 77 22 (Lun–Ven, 8 h – 17 h)</span></li>
              </ul>
              <div className="ps-info-score">
                <div className="ps-info-score-bar">
                  <div
                    className={`ps-info-score-fill ps-score-${scoreColor}`}
                    style={{ width: `${stats.score_sante}%` }}
                    aria-label={`Score santé : ${stats.score_sante}/100`}
                  />
                </div>
                <span className="ps-info-score-label">Score santé : {stats.score_sante}/100</span>
              </div>
            </div>
            <MeteoCard />
            <AirQualityCard />
          </div>
        </section>


        {/* Nos services */}
        <section className="ps-section" aria-labelledby="services-title">
          <h2 id="services-title" className="ps-section-title">Nos services</h2>
          {!user && (
            <p className="ps-services-intro">
              <Link to="/login" className="ps-services-login-link">Connectez-vous</Link> pour accéder aux services.
            </p>
          )}
          <div className="ps-services-grid">
            {visibleServices.map(svc => {
              const card = (
                <>
                  <h3 className="ps-service-title">{svc.nom}</h3>
                  <p className="ps-service-desc">{svc.description}</p>
                  {svc.categorie && <span className="ps-service-chip">{svc.categorie}</span>}
                </>
              )
              return user ? (
                <Link key={svc.id} to={SERVICE_ROUTES[svc.id] || '/services'} className="ps-service-card ps-service-card--link">
                  {card}
                </Link>
              ) : (
                <div key={svc.id} className="ps-service-card ps-service-card--static" aria-disabled="true">
                  {card}
                </div>
              )
            })}
          </div>
        </section>

        {/* Actualités */}
        {annonces.length > 0 && (
          <section className="ps-section" aria-labelledby="actu-title">
            <h2 id="actu-title" className="ps-section-title">Actualités de la résidence</h2>
            <div className="ps-actu-grid">
              {annonces.map(a => (
                <article key={a.id} className="ps-actu-card ps-actu-info">
                  <div className="ps-actu-head">
                    <span className="ps-actu-badge ps-actu-badge-muted">
                      <span aria-hidden="true">📢</span> Annonce
                    </span>
                    <time className="ps-actu-date" dateTime={a.created_at}>{fmtDateAnnonce(a.created_at)}</time>
                  </div>
                  <h3 className="ps-actu-titre">{a.titre}</h3>
                  <p className="ps-actu-resume">{a.contenu}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="ps-footer">
        <p>© 2026 CivicSense — Portail résidentiel</p>
      </footer>
    </div>
  )
}
