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

const TYPE_OPTIONS = ['thermostat', 'camera', 'compteur', 'eclairage', 'capteur', 'prise']
const STATUT_OPTIONS = ['actif', 'inactif', 'maintenance']

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ObjectListPage() {
  const { user, logout } = useAuth()
  const [allItems, setAllItems] = useState([])
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterMarque, setFilterMarque] = useState('')

  useEffect(() => {
    document.title = 'Objets connectés - CivicSense'
  }, [])

  useEffect(() => {
    const params = {}
    if (search.trim()) params.search = search.trim()
    if (filterType) params.type_objet = filterType
    if (filterStatut) params.statut = filterStatut
    if (filterZone) params.zone = filterZone
    if (filterMarque) params.marque = filterMarque

    setLoading(true)
    setFetchError(null)

    const timer = setTimeout(() => {
      api.get('/objects/', { params })
        .then(res => {
          const data = res.data.data
          setObjects(data)
          if (!Object.keys(params).length) setAllItems(data)
          setLoading(false)
        })
        .catch(() => {
          setFetchError('Impossible de charger les objets.')
          setLoading(false)
        })
    }, search ? 300 : 0)

    return () => clearTimeout(timer)
  }, [search, filterType, filterStatut, filterZone, filterMarque])

  const zones = [...new Set(allItems.map(o => o.zone))].sort()
  const marques = [...new Set(allItems.map(o => o.marque).filter(Boolean))].sort()

  const hasFilters = search || filterZone || filterType || filterStatut || filterMarque
  const resetFilters = () => {
    setSearch('')
    setFilterZone('')
    setFilterType('')
    setFilterStatut('')
    setFilterMarque('')
  }

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
          <div className="ol-filter-field ol-filter-field--wide">
            <label htmlFor="ol-search">Recherche</label>
            <input
              id="ol-search"
              type="search"
              placeholder="Nom ou description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-type">Type</label>
            <select id="ol-type" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-statut">Statut</label>
            <select id="ol-statut" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {STATUT_OPTIONS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-zone">Zone</label>
            <select id="ol-zone" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
              <option value="">Toutes les zones</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className="ol-filter-field">
            <label htmlFor="ol-marque">Marque</label>
            <select id="ol-marque" value={filterMarque} onChange={e => setFilterMarque(e.target.value)}>
              <option value="">Toutes les marques</option>
              {marques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {hasFilters && (
            <div className="ol-filter-reset">
              <button onClick={resetFilters} className="btn-reset" type="button">
                Réinitialiser
              </button>
            </div>
          )}
        </section>

        {loading && <p className="ol-state">Chargement…</p>}
        {fetchError && <p className="ol-state ol-state--error" role="alert">{fetchError}</p>}

        {!loading && !fetchError && objects.length === 0 && (
          <p className="ol-state">Aucun objet trouvé.</p>
        )}

        {!loading && !fetchError && objects.length > 0 && (
          <ul className="ol-grid" role="list">
            {objects.map(obj => (
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
                      <dt>Type</dt>
                      <dd>{TYPE_LABELS[obj.type_objet] || obj.type_objet}</dd>
                    </div>
                    <div>
                      <dt>Zone</dt>
                      <dd>{obj.zone}</dd>
                    </div>
                    <div>
                      <dt>Marque</dt>
                      <dd>{obj.marque || '—'}</dd>
                    </div>
                    <div>
                      <dt>Dernière int.</dt>
                      <dd>{fmtDate(obj.derniere_interaction)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && (
          <p className="ol-count">
            {objects.length} objet{objects.length !== 1 ? 's' : ''} affiché{objects.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      <footer className="ol-footer">
        <p>© 2025 CivicSense — Projet ING1</p>
      </footer>
    </div>
  )
}
