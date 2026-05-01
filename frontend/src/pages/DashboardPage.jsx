import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import AlertsDashboardWidget from './AlertsDashboardWidget'
import './DashboardPage.css'

// ── Météo ─────────────────────────────────────────────────────────────────────
function wmoLabel(code) {
  if (code === 0)           return { label: 'Ciel dégagé',          icon: '☀️' }
  if (code <= 2)            return { label: 'Partiellement nuageux', icon: '⛅' }
  if (code <= 3)            return { label: 'Couvert',               icon: '☁️' }
  if (code <= 49)           return { label: 'Brouillard',            icon: '🌫️' }
  if (code <= 57)           return { label: 'Bruine',                icon: '🌦️' }
  if (code <= 67)           return { label: 'Pluie',                 icon: '🌧️' }
  if (code <= 77)           return { label: 'Neige',                 icon: '❄️' }
  if (code <= 82)           return { label: 'Averses',               icon: '🌦️' }
  if (code <= 99)           return { label: 'Orage',                 icon: '⛈️' }
  return { label: 'Variable', icon: '🌤️' }
}

function MeteoWidget() {
  const [meteo, setMeteo] = useState(null)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m&timezone=Europe%2FParis')
      .then(r => r.json())
      .then(d => setMeteo(d.current))
      .catch(() => {})
  }, [])
  if (!meteo) return null
  const { label, icon } = wmoLabel(meteo.weathercode)
  return (
    <div className="dash-meteo">
      <span className="dash-meteo-icon" aria-hidden="true">{icon}</span>
      <div className="dash-meteo-info">
        <span className="dash-meteo-temp">{Math.round(meteo.temperature_2m)}°C</span>
        <span className="dash-meteo-label">{label} · Paris</span>
        <span className="dash-meteo-detail">
          Ressenti {Math.round(meteo.apparent_temperature)}°C · Humidité {meteo.relative_humidity_2m}%
        </span>
      </div>
    </div>
  )
}

// Les 4 services proposés par la résidence
const RESIDENCE_SERVICES = [
  { id: 'acces',   nom: 'Gestion d\'accès',         description: 'Contrôle des serrures et digicodes', icon: '🚪', couleur: '#3b82f6' },
  { id: 'energie', nom: 'Consommation d\'énergie',   description: 'Suivi et optimisation électrique',   icon: '⚡', couleur: '#f59e0b' },
  { id: 'eau',     nom: 'Consommation d\'eau',       description: 'Monitoring et détection de fuites',  icon: '💧', couleur: '#06b6d4' },
  { id: 'dechets', nom: 'Gestion des déchets',       description: 'Collectes et suivi des conteneurs',  icon: '♻️', couleur: '#22c55e' },
]

const SERVICE_ROUTES = {
  acces: '/services/acces',
  energie: '/services/energie',
  eau: '/services/eau',
  dechets: '/services/dechets',
}

// Mapping des types d'objets par service
const SERVICE_OBJECT_TYPES = {
  acces:   ['serrure', 'digicode', 'capteur_porte'],
  energie: ['compteur', 'prise', 'eclairage', 'thermostat'],
  eau:     ['compteur_eau', 'capteur_fuite'],
  dechets: ['capteur_remplissage'],
}

// ── Niveaux ───────────────────────────────────────────────────────────────────
const LEVEL_META = {
  debutant:      { label: 'Débutant',      color: '#6b7280' },
  intermediaire: { label: 'Intermédiaire', color: '#0ea5e9' },
  avance:        { label: 'Avancé',        color: '#f59e0b' },
  expert:        { label: 'Expert',        color: '#ef4444' },
}
const LEVEL_THRESHOLDS = { debutant: 0, intermediaire: 3, avance: 5, expert: 7 }
const LEVEL_NEXT       = { debutant: 'intermediaire', intermediaire: 'avance', avance: 'expert', expert: null }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const [publicStats, setPublicStats] = useState({ score_sante: null, objets_actifs: 0, incidents_en_cours: 0, total_objets: 0, en_maintenance: 0 })
  const [allObjects, setAllObjects]   = useState([])
  const [alerts, setAlerts]           = useState([])
  const [annonces, setAnnonces]       = useState([])
  const [triggeredAlerts, setTriggeredAlerts] = useState([])
  const [pendingUsers, setPendingUsers]       = useState(0)
  const [pendingDeletions, setPendingDeletions] = useState(0)

  const isAvancePlus = user?.level === 'avance' || user?.level === 'expert'
  const isExpert     = user?.level === 'expert'

  useEffect(() => {
    document.title = 'Tableau de bord — CivicSense'

    // KPIs unifiés : même source que la page publique → scores cohérents
    api.get('/public/stats/')
      .then(res => { if (res.data?.data) setPublicStats(p => ({ ...p, ...res.data.data })) })
      .catch(() => {})

    // Charger les objets pour les stats des services
    api.get('/objects/')
      .then(res => { if (res.data?.data) setAllObjects(res.data.data) })
      .catch(() => {})

    // Charger les alertes
    api.get('/objects/alerts/')
      .then(res => { if (res.data?.data) setAlerts(res.data.data) })
      .catch(() => {})

    api.get('/announcements/').then(res => {
      const list = res.data?.data ?? []
      setAnnonces(
        list
          .filter(a => a.visible)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 3)
      )
    }).catch(() => {})

    if (isAvancePlus) {
      api.get('/objects/alert-rules/').then(res => {
        if (res.data.success) {
          setTriggeredAlerts(res.data.data.filter(r => r.declenchee && r.active))
        }
      }).catch(() => {})
    }

    if (isExpert) {
      api.get('/admin/users/pending/')
        .then(res => setPendingUsers(res.data.data?.length ?? 0))
        .catch(() => {})
      api.get('/deletion-requests/')
        .then(res => setPendingDeletions(res.data.data?.length ?? 0))
        .catch(() => {})
    }
  }, [user?.level, isAvancePlus, isExpert])

  const levelMeta = LEVEL_META[user?.level] ?? LEVEL_META.debutant
  const nextLevel = LEVEL_NEXT[user?.level]
  const pct = nextLevel && user
    ? Math.min(100, ((user.points - LEVEL_THRESHOLDS[user.level]) / (LEVEL_THRESHOLDS[nextLevel] - LEVEL_THRESHOLDS[user.level])) * 100)
    : 100

  const scoreColor = publicStats.score_sante === null ? '' : publicStats.score_sante >= 80 ? 'green' : publicStats.score_sante >= 60 ? 'orange' : 'red'
  const fullName   = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.pseudo

  return (
    <div className="dash-page page-content">

      {/* ── Notifications admin ── */}
      {isExpert && (pendingUsers > 0 || pendingDeletions > 0) && (
        <div className="dash-notifs">
          {pendingUsers > 0 && (
            <Link to="/admin/pending" className="dash-notif dash-notif--info">
              <span className="dash-notif-icon" aria-hidden="true">👤</span>
              <span className="dash-notif-text">
                <strong>{pendingUsers}</strong> inscription{pendingUsers > 1 ? 's' : ''} en attente de validation
              </span>
              <span className="dash-notif-arrow">→</span>
            </Link>
          )}
          {pendingDeletions > 0 && (
            <Link to="/admin/deletions" className="dash-notif dash-notif--warning">
              <span className="dash-notif-icon" aria-hidden="true">🗑️</span>
              <span className="dash-notif-text">
                <strong>{pendingDeletions}</strong> demande{pendingDeletions > 1 ? 's' : ''} de suppression d'objet
              </span>
              <span className="dash-notif-arrow">→</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Hero ── */}
      <section className="dash-hero">
        <div className="dash-hero-left">
          <p className="dash-hero-hi">Bonjour,</p>
          <h1 className="dash-hero-name">{fullName}</h1>
          <div className="dash-hero-meta">
            <span className="dash-level-pill" style={{ '--lc': levelMeta.color }}>
              {levelMeta.label}
            </span>
            <span className="dash-pts">{user?.points?.toFixed(1)} pts</span>
          </div>
          {nextLevel && (
            <div className="dash-progress-row">
              <div className="dash-progress-track">
                <div className="dash-progress-fill" style={{ width: `${pct}%`, background: levelMeta.color }} />
              </div>
              <span className="dash-progress-hint">
                {LEVEL_THRESHOLDS[nextLevel] - (user?.points ?? 0) > 0
                  ? `${(LEVEL_THRESHOLDS[nextLevel] - user.points).toFixed(1)} pts pour ${LEVEL_META[nextLevel].label}`
                  : 'Niveau en cours de mise à jour'}
              </span>
            </div>
          )}
        </div>
        <MeteoWidget />
      </section>

      {/* ── Barre KPI (identique à la page publique) ── */}
      <div className="dash-kpi-bar" aria-label="Indicateurs en direct">
        <div className={`dash-kpi dash-kpi--${scoreColor || 'neutral'}`}>
          <span className="dash-kpi-value">
            {publicStats.score_sante !== null ? publicStats.score_sante : '—'}
            <span className="dash-kpi-unit">/100</span>
          </span>
          <span className="dash-kpi-label">Score santé</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value">{publicStats.objets_actifs}</span>
          <span className="dash-kpi-label">Objets actifs</span>
        </div>
        <div className={`dash-kpi${publicStats.incidents_en_cours > 0 ? ' dash-kpi--red' : ''}`}>
          <span className="dash-kpi-value">{publicStats.incidents_en_cours}</span>
          <span className="dash-kpi-label">Incidents en cours</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-value">{publicStats.total_objets}</span>
          <span className="dash-kpi-label">Objets total</span>
        </div>
      </div>

      <div className="dash-two-col">

        {/* ── Alertes déclenchées (expert uniquement) ── */}
        {isExpert && (
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Alertes déclenchées</h2>
              <Link to="/alerts" className="dash-see-all">Voir tout →</Link>
            </div>
            <AlertsDashboardWidget />
          </section>
        )}

        {/* ── Annonces ── */}
        {annonces.length > 0 && (
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Actualités résidence</h2>
            </div>
            <div className="dash-annonces">
              {annonces.map(a => (
                <div key={a.id} className="dash-annonce-card">
                  <p className="dash-annonce-titre">{a.titre}</p>
                  <p className="dash-annonce-contenu">{a.contenu}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Services de la résidence ── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">Services</h2>
        </div>
        <div className="dash-services-grid">
          {RESIDENCE_SERVICES.map(s => {
            const serviceTypes = SERVICE_OBJECT_TYPES[s.id] || []
            const serviceObjects = allObjects.filter(obj =>
              serviceTypes.some(t => obj.type_objet === t)
            )
            const activeCount = serviceObjects.filter(o => o.statut === 'actif').length

            return (
              <Link key={s.id} to={SERVICE_ROUTES[s.id] || '/services'} className="dash-service-card" style={{ '--service-color': s.couleur }}>
                <span className="dash-service-icon">{s.icon}</span>
                <p className="dash-service-nom">{s.nom}</p>
                <p className="dash-service-desc">{s.description}</p>
                <span className="dash-service-count">
                  {serviceObjects.length} objet{serviceObjects.length !== 1 ? 's' : ''} · {activeCount} actif{activeCount !== 1 ? 's' : ''}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

    </div>
  )
}
