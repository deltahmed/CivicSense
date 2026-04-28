import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './PublicStatsPage.css'

const EMPTY_STATS = {
  nom_residence: 'Résidence indisponible',
  score_sante: 0,
  objets_actifs: 0,
  incidents_en_cours: 0,
  annonces: [],
  types_objets: [],
}

function setPageMeta(title, description) {
  document.title = title
  const meta = document.querySelector('meta[name="description"]')
  if (meta) {
    meta.setAttribute('content', description)
  } else {
    const newMeta = document.createElement('meta')
    newMeta.setAttribute('name', 'description')
    newMeta.setAttribute('content', description)
    document.head.appendChild(newMeta)
  }
}

export default function PublicStatsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(EMPTY_STATS)
  const [mouse, setMouse] = useState({ x: 50, y: 14, rx: 0, ry: 0 })

  useEffect(() => {
    setPageMeta(
      'Statistiques publiques - CivicSense',
      'Vue publique CivicSense : score santé, incidents, objets actifs, annonces et types d objets disponibles.'
    )
  }, [])

  useEffect(() => {
    api
      .get('/public/stats/')
      .then(res => {
        setStats({ ...EMPTY_STATS, ...(res.data?.data ?? {}) })
      })
      .catch(() => {
        setError('Statistiques publiques indisponibles pour le moment.')
      })
      .finally(() => setLoading(false))
  }, [])

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const rx = ((x - 50) / 50) * 1.2
    const ry = ((y - 50) / 50) * -1.2
    setMouse({ x, y, rx, ry })
  }

  function handleMouseLeave() {
    setMouse({ x: 50, y: 14, rx: 0, ry: 0 })
  }

  return (
    <div
      className="public-stats-page"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mx': `${mouse.x}%`,
        '--my': `${mouse.y}%`,
        '--rx': mouse.rx,
        '--ry': mouse.ry,
      }}
    >
      <div className="ambient-orb orb-a" aria-hidden="true" />
      <div className="ambient-orb orb-b" aria-hidden="true" />
      <header className="public-header">
        <div className="public-header-inner">
          <div className="hero-copy">
            <p className="eyebrow">Module Information</p>
            <h1>CivicSense - Statistiques Publiques</h1>
            <p className="intro">
              Consultez les indicateurs de la résidence sans connexion.
            </p>

            <nav className="hero-actions" aria-label="Navigation publique">
              <Link className="hero-btn-primary" to="/login">Se connecter</Link>
              <Link className="hero-btn-secondary" to="/register">S'inscrire</Link>
              <a className="public-link" href="/public/search">Recherche publique</a>
            </nav>
          </div>

          <aside className="hero-highlight" aria-label="Chiffres clés">
            <p className="highlight-label">Résidence</p>
            <h2>{stats.nom_residence}</h2>
            <div className="hero-kpis">
              <article className="kpi-pill">
                <span className="kpi-label">Score santé</span>
                <strong>{stats.score_sante}/100</strong>
              </article>
              <article className="kpi-pill">
                <span className="kpi-label">Objets actifs</span>
                <strong>{stats.objets_actifs}</strong>
              </article>
              <article className="kpi-pill">
                <span className="kpi-label">Incidents en cours</span>
                <strong>{stats.incidents_en_cours}</strong>
              </article>
            </div>
          </aside>
        </div>
      </header>

      <main className="public-main">
        {loading && <p aria-live="polite">Chargement...</p>}
        {!loading && error && (
          <p className="public-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <section className="cards-section" aria-labelledby="overview-title">
          <h2 id="overview-title">Aperçu global</h2>
          <div className="cards-grid">
            <article className="stat-card stat-card-featured">
              <h3>Nom de la résidence</h3>
              <p>{stats.nom_residence}</p>
            </article>

            <article className="stat-card">
              <h3>Score santé</h3>
              <p>{stats.score_sante}/100</p>
            </article>

            <article className="stat-card">
              <h3>Objets actifs</h3>
              <p>{stats.objets_actifs}</p>
            </article>

            <article className="stat-card">
              <h3>Incidents en cours</h3>
              <p>{stats.incidents_en_cours}</p>
            </article>
          </div>
        </section>

        <section className="cards-section" aria-labelledby="annonces-title">
          <h2 id="annonces-title">5 dernières annonces</h2>
          <div className="cards-grid">
            {stats.annonces.length === 0 && (
              <article className="stat-card">
                <p>Aucune annonce publique disponible.</p>
              </article>
            )}
            {stats.annonces.map(annonce => (
              <article key={annonce.id} className="stat-card">
                <h3>{annonce.titre}</h3>
                <p>{annonce.contenu}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cards-section" aria-labelledby="types-title">
          <h2 id="types-title">Types d'objets disponibles</h2>
          <article className="stat-card">
            {stats.types_objets.length === 0 ? (
              <p>Aucun type d'objet disponible.</p>
            ) : (
              <ul className="types-list">
                {stats.types_objets.map(type => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </main>

      <footer className="public-footer">
        <p>© 2026 CivicSense</p>
      </footer>
    </div>
  )
}
