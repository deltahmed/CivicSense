import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/index'
import './ObjectListPage.css'

const STATUT_LABELS = {
  actif: 'Actif',
  inactif: 'Inactif',
  maintenance: 'En maintenance',
}

const TYPE_LABELS = {
  thermostat: 'Thermostat',
  camera: 'Caméra',
  compteur: 'Compteur',
  eclairage: 'Éclairage',
  capteur: 'Capteur',
  prise: 'Prise',
}

export default function ObjectListPage() {
  const { user, logout } = useAuth()
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    document.title = 'Objets connectés - CivicSense'
    api.get('/objects/')
      .then(res => {
        setObjects(res.data.data)
        setLoading(false)
      })
      .catch(() => {
        setFetchError('Impossible de charger les objets.')
        setLoading(false)
      })
  }, [])

  const zones = [...new Set(objects.map(o => o.zone))].sort()
  const types = [...new Set(objects.map(o => o.type_objet))].sort()

  const filtered = objects.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.nom.toLowerCase().includes(q) || o.zone.toLowerCase().includes(q)
    const matchZone = !filterZone || o.zone === filterZone
    const matchType = !filterType || o.type_objet === filterType
    return matchSearch && matchZone && matchType
  })

  return (
    <div className="ol-layout">
      <header className="ol-header">
        <span className="ol-brand">CivicSense</span>
        <nav aria-label="Navigation principale">
          <ul className="nav-links">
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/objects" aria-current="page">Objets</Link></li>
            <li><Link to="/alerts">Alertes</Link></li>
            {['avance', 'expert'].includes(user?.level) && (
              <li><Link to="/admin/reports">Rapports</Link></li>
            )}
            {user?.level === 'expert' && (
              <li><Link to="/admin/settings">Paramètres</Link></li>
            )}
          </ul>
        </nav>
        <button className="btn-logout" onClick={logout}>Déconnexion</button>
      </header>

      <main className="ol-main">
        <h1>Objets connectés</h1>

        <section className="ol-filters" aria-label="Filtres">
          <div className="ol-filter-field">
            <label htmlFor="ol-search">Recherche</label>
            <input
              id="ol-search"
              type="search"
              placeholder="Nom ou zone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-zone">Zone</label>
            <select id="ol-zone" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
              <option value="">Toutes les zones</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-type">Type</label>
            <select id="ol-type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
        </section>

        {loading && <p className="ol-state">Chargement…</p>}
        {fetchError && <p className="ol-state ol-state--error" role="alert">{fetchError}</p>}

        {!loading && !fetchError && filtered.length === 0 && (
          <p className="ol-state">Aucun objet trouvé.</p>
        )}

        {!loading && !fetchError && filtered.length > 0 && (
          <ul className="ol-grid" role="list">
            {filtered.map(obj => (
              <li key={obj.id} className="ol-card">
                <Link to={`/objects/${obj.id}`} className="ol-card-link">
                  <div className="ol-card-top">
                    <span className="ol-card-nom">{obj.nom}</span>
                    <span className={`ol-badge ol-badge--${obj.statut}`}>
                      {STATUT_LABELS[obj.statut] || obj.statut}
                    </span>
                  </div>
                  <dl className="ol-card-meta">
                    <div>
                      <dt>Zone</dt>
                      <dd>{obj.zone}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{TYPE_LABELS[obj.type_objet] || obj.type_objet}</dd>
                    </div>
                    <div>
                      <dt>Batterie</dt>
                      <dd>{obj.batterie} %</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && (
          <p className="ol-count">
            {filtered.length} objet{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      <footer className="ol-footer">
        <p>© 2025 CivicSense — Projet ING1</p>
      </footer>
    </div>
  )
}
