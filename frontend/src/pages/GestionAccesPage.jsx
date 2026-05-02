import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import '../styles/GestionAccesPage.css'

const TYPE_LABELS = {
  serrure: 'Serrure connectée',
  digicode: 'Digicode',
  capteur_porte: 'Capteur de porte',
}

const STATUT_LABELS = { actif: 'Actif', inactif: 'Inactif', maintenance: 'Maintenance' }

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  if (isToday) return `Aujourd'hui ${h}:${m}`
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month} ${h}:${m}`
}

export default function GestionAccesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [portes, setPortes] = useState([])
  const [historique, setHistorique] = useState([])
  const [loadingPortes, setLoadingPortes] = useState(true)
  const [loadingHisto, setLoadingHisto] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [period, setPeriod] = useState('7d')
  const [filterDir, setFilterDir] = useState('')
  const [filterObjet, setFilterObjet] = useState('')

  const isAvance = user?.level === 'avance' || user?.level === 'expert'
  const [showBlockedModal, setShowBlockedModal] = useState(!isAvance)

  const loadPortes = useCallback(async () => {
    setLoadingPortes(true)
    try {
      const res = await api.get('/services/acces/portes/')
      setPortes(res.data?.data ?? [])
    } catch {
      setPortes([])
    } finally {
      setLoadingPortes(false)
    }
  }, [])

  const loadHistorique = useCallback(async () => {
    setLoadingHisto(true)
    try {
      const params = { period }
      if (filterDir) params.direction = filterDir
      if (filterObjet) params.objet = filterObjet
      const res = await api.get('/services/acces/historique/', { params })
      setHistorique(res.data?.data ?? [])
    } catch {
      setHistorique([])
    } finally {
      setLoadingHisto(false)
    }
  }, [period, filterDir, filterObjet])

  useEffect(() => {
    document.title = 'Gestion d\'accès — CivicSense'
    loadPortes()
  }, [loadPortes])

  useEffect(() => {
    loadHistorique()
  }, [loadHistorique])

  const handleToggle = async (objet) => {
    if (!isAvance || toggling) return
    setToggling(objet.id)
    try {
      await api.patch(`/services/acces/toggle/${objet.id}/`)
      await loadPortes()
      await loadHistorique()
    } catch {
      // silencieux
    } finally {
      setToggling(null)
    }
  }

  const actifs = portes.filter(p => p.statut === 'actif').length
  const inactifs = portes.filter(p => p.statut === 'inactif').length
  const maintenance = portes.filter(p => p.statut === 'maintenance').length
  const entrees = historique.filter(h => h.direction === 'entree').length
  const sorties = historique.filter(h => h.direction === 'sortie').length
  const refuses = historique.filter(h => !h.acces_autorise).length

  return (
    <main className="acces-page page-content">
      <title>Gestion d'accès — CivicSense</title>

      {/* Modal d'accès restreint pour débutant / intermédiaire */}
      {!isAvance && showBlockedModal && (
        <div className="acces-blocked-backdrop" role="dialog" aria-modal="true" aria-labelledby="blocked-title">
          <div className="acces-blocked-modal">
            <div className="acces-blocked-icon" aria-hidden="true">🔒</div>
            <h2 id="blocked-title" className="acces-blocked-title">Accès restreint</h2>
            <p className="acces-blocked-desc">
              Vous n'avez pas accès à cette page.<br />
              Cette fonctionnalité est réservée aux membres de niveau <strong>Avancé</strong> ou <strong>Expert</strong>.
            </p>
            <button
              className="acces-blocked-btn"
              onClick={() => { setShowBlockedModal(false); navigate('/services') }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <nav className="acces-breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/services">Services</Link>
        <span aria-hidden="true"> / </span>
        <span>Gestion d'accès</span>
      </nav>

      <header className="acces-header">
        <div className="acces-header-icon" aria-hidden="true">🚪</div>
        <div>
          <h1>Gestion d'accès</h1>
          <p>Contrôle des serrures, digicodes et capteurs de la résidence</p>
        </div>
      </header>

      {/* KPIs */}
      <section className="acces-kpi-grid" aria-label="Statistiques d'accès">
        <div className="acces-kpi">
          <span className="acces-kpi-value">{portes.length}</span>
          <span className="acces-kpi-label">Points d'accès</span>
        </div>
        <div className="acces-kpi acces-kpi--success">
          <span className="acces-kpi-value">{actifs}</span>
          <span className="acces-kpi-label">Actifs</span>
        </div>
        <div className="acces-kpi acces-kpi--warning">
          <span className="acces-kpi-value">{inactifs}</span>
          <span className="acces-kpi-label">Désactivés</span>
        </div>
        <div className="acces-kpi acces-kpi--danger">
          <span className="acces-kpi-value">{refuses}</span>
          <span className="acces-kpi-label">Accès refusés</span>
        </div>
      </section>

      {/* Liste des portes */}
      <section className="acces-section">
        <h2>Points d'accès</h2>

        {loadingPortes ? (
          <p className="acces-state">Chargement...</p>
        ) : portes.length === 0 ? (
          <p className="acces-state">Aucun point d'accès enregistré.</p>
        ) : (
          <ul className="acces-portes-list">
            {portes.map(porte => (
              <li key={porte.id} className={`acces-porte-card acces-porte-card--${porte.statut}`}>
                <div className="acces-porte-info">
                  <div className="acces-porte-top">
                    <span className="acces-porte-nom">{porte.nom}</span>
                    <span className={`acces-badge acces-badge--${porte.statut}`}>
                      {STATUT_LABELS[porte.statut] ?? porte.statut}
                    </span>
                  </div>
                  <div className="acces-porte-meta">
                    <span>{TYPE_LABELS[porte.type_objet] ?? porte.type_objet}</span>
                    <span>·</span>
                    <span>{porte.zone}</span>
                    {porte.batterie != null && (
                      <>
                        <span>·</span>
                        <span className={porte.batterie < 20 ? 'acces-batt-low' : ''}>
                          🔋 {porte.batterie}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="acces-porte-actions">
                  <Link to={`/objects/${porte.id}`} className="acces-btn acces-btn--secondary">
                    Détails
                  </Link>
                  {isAvance && porte.statut !== 'maintenance' && (
                    <button
                      type="button"
                      className={`acces-btn ${porte.statut === 'actif' ? 'acces-btn--danger' : 'acces-btn--success'}`}
                      onClick={() => handleToggle(porte)}
                      disabled={toggling === porte.id}
                      aria-label={`${porte.statut === 'actif' ? 'Désactiver' : 'Activer'} ${porte.nom}`}
                    >
                      {toggling === porte.id
                        ? 'En cours...'
                        : porte.statut === 'actif' ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historique */}
      <section className="acces-section">
        <h2>Historique des entrées / sorties</h2>

        <div className="acces-histo-filters">
          <div className="acces-filter-field">
            <label htmlFor="histo-period">Période</label>
            <select id="histo-period" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
            </select>
          </div>

          <div className="acces-filter-field">
            <label htmlFor="histo-dir">Direction</label>
            <select id="histo-dir" value={filterDir} onChange={e => setFilterDir(e.target.value)}>
              <option value="">Toutes</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
          </div>

          <div className="acces-filter-field">
            <label htmlFor="histo-objet">Point d'accès</label>
            <select id="histo-objet" value={filterObjet} onChange={e => setFilterObjet(e.target.value)}>
              <option value="">Tous</option>
              {portes.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Résumé */}
        <div className="acces-histo-summary">
          <span>{historique.length} événement{historique.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{entrees} entrée{entrees !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{sorties} sortie{sorties !== 1 ? 's' : ''}</span>
          {refuses > 0 && (
            <>
              <span>·</span>
              <span className="acces-histo-summary--danger">{refuses} refusé{refuses !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        {loadingHisto ? (
          <p className="acces-state">Chargement...</p>
        ) : historique.length === 0 ? (
          <p className="acces-state">Aucun événement sur cette période.</p>
        ) : (
          <div className="acces-histo-table-wrapper" role="region" aria-label="Tableau d'historique">
            <table className="acces-histo-table">
              <thead>
                <tr>
                  <th scope="col">Horodatage</th>
                  <th scope="col">Point d'accès</th>
                  <th scope="col">Zone</th>
                  <th scope="col">Direction</th>
                  <th scope="col">Utilisateur</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(log => (
                  <tr key={log.id} className={!log.acces_autorise ? 'acces-row--refused' : ''}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>{log.objet_nom}</td>
                    <td>{log.objet_zone}</td>
                    <td>
                      <span className={`acces-dir acces-dir--${log.direction}`}>
                        {log.direction === 'entree' ? '↙ Entrée' : '↗ Sortie'}
                      </span>
                    </td>
                    <td>{log.utilisateur_pseudo || '—'}</td>
                    <td>
                      <span className={`acces-badge ${log.acces_autorise ? 'acces-badge--actif' : 'acces-badge--inactif'}`}>
                        {log.acces_autorise ? 'Autorisé' : 'Refusé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
