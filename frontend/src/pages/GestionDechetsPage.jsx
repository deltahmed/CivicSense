import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import '../styles/GestionDechetsPage.css'

const TYPE_COLORS = {
  recyclage: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '♻️' },
  ordures:   { bg: '#fafafa', border: '#d1d5db', text: '#374151', icon: '🗑️' },
  verre:     { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', icon: '🫙' },
}

const TYPE_LABELS = { recyclage: 'Recyclage', ordures: 'Ordures ménagères', verre: 'Verre' }

function BacFillBar({ taux, type }) {
  const colors = { recyclage: '#22c55e', ordures: '#6b7280', verre: '#3b82f6' }
  const color = taux >= 80 ? '#ef4444' : taux >= 60 ? '#f59e0b' : colors[type] ?? '#6b7280'
  return (
    <div className="dechets-fill-bar-wrapper" aria-label={`Remplissage : ${taux}%`}>
      <div className="dechets-fill-bar">
        <div className="dechets-fill-bar-inner" style={{ width: `${taux}%`, background: color }} />
      </div>
      <span className="dechets-fill-pct" style={{ color }}>{taux}%</span>
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatHeure(heureStr) {
  return heureStr?.slice(0, 5) ?? ''
}

export default function GestionDechetsPage() {
  const [collectes, setCollectes] = useState([])
  const [rappels, setRappels] = useState([])
  const [bacs, setBacs] = useState([])
  const [tauxTri, setTauxTri] = useState(0)
  const [bacsAlerte, setBacsAlerte] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [calRes, bacsRes] = await Promise.all([
        api.get('/services/dechets/calendrier/'),
        api.get('/services/dechets/bacs/'),
      ])
      setCollectes(calRes.data?.data ?? [])
      setRappels(calRes.data?.rappels ?? [])
      setBacs(bacsRes.data?.data ?? [])
      setTauxTri(bacsRes.data?.taux_tri_global ?? 0)
      setBacsAlerte(bacsRes.data?.bacs_en_alerte ?? [])
    } catch {
      setCollectes([])
      setBacs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Gestion des déchets — CivicSense'
    loadData()
  }, [loadData])

  return (
    <main className="dechets-page page-content">
      <title>Gestion des déchets — CivicSense</title>

      <nav className="dechets-breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/services">Services</Link>
        <span aria-hidden="true"> / </span>
        <span>Gestion des déchets</span>
      </nav>

      <header className="dechets-header">
        <div className="dechets-header-icon" aria-hidden="true">♻️</div>
        <div>
          <h1>Gestion des déchets</h1>
          <p>Calendrier de collecte et suivi du taux de remplissage</p>
        </div>
      </header>

      {loading ? (
        <p className="dechets-state">Chargement...</p>
      ) : (
        <>
          {/* Rappels urgents */}
          {rappels.length > 0 && (
            <div className="dechets-rappels" role="alert">
              <h2>Collectes imminentes</h2>
              <ul className="dechets-rappels-list">
                {rappels.map(r => {
                  const meta = TYPE_COLORS[r.type_dechet] ?? {}
                  return (
                    <li key={r.id} className="dechets-rappel-item" style={{ background: meta.bg, borderColor: meta.border }}>
                      <span className="dechets-rappel-icon" aria-hidden="true">{meta.icon}</span>
                      <div>
                        <strong>{TYPE_LABELS[r.type_dechet] ?? r.type_dechet}</strong>
                        {' — '}
                        {r.jours_restants === 0
                          ? "Aujourd'hui"
                          : r.jours_restants === 1
                          ? 'Demain'
                          : `Dans ${r.jours_restants} jours`}
                        {' à '}
                        {formatHeure(r.heure)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Taux de tri + KPIs */}
          <section className="dechets-tri-section" aria-label="Taux de tri">
            <div className="dechets-tri-card">
              <div className="dechets-tri-gauge" role="img" aria-label={`Taux de tri global : ${tauxTri}%`}>
                <svg viewBox="0 0 100 60" className="dechets-tri-svg" aria-hidden="true">
                  <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <path
                    d="M10 50 A40 40 0 0 1 90 50"
                    fill="none"
                    stroke={tauxTri >= 60 ? '#22c55e' : tauxTri >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10"
                    strokeDasharray={`${tauxTri * 1.26} 126`}
                  />
                </svg>
                <div className="dechets-tri-value">{tauxTri}%</div>
              </div>
              <p className="dechets-tri-label">Taux de tri global</p>
              <p className="dechets-tri-sub">recyclage + verre sur total collecté</p>
            </div>

            {bacsAlerte.length > 0 && (
              <div className="dechets-bacs-alerte-panel">
                <h3>Conteneurs à vider</h3>
                <ul className="dechets-alerte-list">
                  {bacsAlerte.map(b => (
                    <li key={b.id} className="dechets-alerte-item">
                      <span>{TYPE_COLORS[b.type_dechet]?.icon ?? '🗑️'}</span>
                      <span className="dechets-alerte-nom">{b.nom}</span>
                      <span className="dechets-alerte-pct">{b.taux_remplissage}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Calendrier de collecte */}
          <section className="dechets-section">
            <h2>Calendrier des collectes</h2>

            {collectes.length === 0 ? (
              <p className="dechets-state">Aucune collecte planifiée.</p>
            ) : (
              <ul className="dechets-collectes-list">
                {collectes.map(c => {
                  const meta = TYPE_COLORS[c.type_dechet] ?? {}
                  const isUrgent = c.jours_restants <= 2
                  return (
                    <li
                      key={c.id}
                      className={`dechets-collecte-card ${isUrgent ? 'dechets-collecte-card--urgent' : ''}`}
                      style={{ borderLeftColor: meta.border }}
                    >
                      <div className="dechets-collecte-icon" aria-hidden="true">{meta.icon}</div>
                      <div className="dechets-collecte-info">
                        <strong className="dechets-collecte-type" style={{ color: meta.text }}>
                          {TYPE_LABELS[c.type_dechet] ?? c.type_dechet}
                        </strong>
                        <p className="dechets-collecte-date">{formatDate(c.prochaine_collecte)}</p>
                        <p className="dechets-collecte-meta">
                          À {formatHeure(c.heure)}
                          {c.description && <> — {c.description}</>}
                        </p>
                      </div>
                      <div className="dechets-collecte-countdown">
                        {c.jours_restants === 0
                          ? <span className="dechets-countdown--today">Aujourd'hui</span>
                          : c.jours_restants === 1
                          ? <span className="dechets-countdown--soon">Demain</span>
                          : c.jours_restants < 0
                          ? <span className="dechets-countdown--past">Passée</span>
                          : <span>J{c.jours_restants > 0 ? '-' : '+'}{Math.abs(c.jours_restants)}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Taux de remplissage des bacs */}
          <section className="dechets-section">
            <h2>État des conteneurs</h2>

            {bacs.length === 0 ? (
              <p className="dechets-state">Aucun capteur de remplissage disponible.</p>
            ) : (
              <ul className="dechets-bacs-list">
                {bacs.map(bac => {
                  const meta = TYPE_COLORS[bac.type_dechet] ?? {}
                  return (
                    <li
                      key={bac.id}
                      className={`dechets-bac-card ${bac.alerte ? 'dechets-bac-card--alerte' : ''}`}
                    >
                      <div className="dechets-bac-header">
                        <span className="dechets-bac-icon" aria-hidden="true">{meta.icon ?? '🗑️'}</span>
                        <div className="dechets-bac-info">
                          <strong className="dechets-bac-nom">{bac.nom}</strong>
                          <span className="dechets-bac-meta">
                            {TYPE_LABELS[bac.type_dechet] ?? bac.type_dechet} · {bac.zone}
                          </span>
                        </div>
                        {bac.alerte && (
                          <span className="dechets-bac-badge" role="img" aria-label="Conteneur plein">
                            À vider
                          </span>
                        )}
                      </div>
                      <BacFillBar taux={bac.taux_remplissage} type={bac.type_dechet} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
