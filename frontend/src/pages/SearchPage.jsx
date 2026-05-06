import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './SearchPage.css'

const TYPE_OBJET_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'thermostat', label: 'Thermostat' },
  { value: 'camera', label: 'Caméra' },
  { value: 'compteur', label: 'Compteur' },
  { value: 'eclairage', label: 'Éclairage' },
  { value: 'capteur', label: 'Capteur' },
  { value: 'prise', label: 'Prise' },
]

const STATUT_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
  { value: 'maintenance', label: 'En maintenance' },
]

const ZONE_LABELS = {
  RDC: 'Rez-de-chaussée',
  Cave: 'Cave',
  Extérieur: 'Extérieur',
  Chambre: 'Chambre',
  Cuisine: 'Cuisine',
  Salon: 'Salon',
  'Salle de bain': 'Salle de bain',
}

function getStatutColor(statut) {
  switch (statut) {
    case 'actif':
      return '#28a745'
    case 'inactif':
      return '#6c757d'
    case 'maintenance':
      return '#ffc107'
    default:
      return '#6c757d'
  }
}

export default function SearchPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeObjet, setTypeObjet] = useState('')
  const [statut, setStatut] = useState('')
  const [zone, setZone] = useState('')
  const [zoneOptions, setZoneOptions] = useState([{ value: '', label: 'Toutes les zones' }])

  const [searched, setSearched] = useState(false)

  const performSearch = async () => {
    setSearched(true)
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (typeObjet) params.append('type_objet', typeObjet)
      if (statut) params.append('statut', statut)
      if (zone) params.append('zone', zone)

      const response = await api.get(`/objects/search/?${params.toString()}`)
      setResults(response.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la recherche')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/objects/zones/')
      .then(response => {
        const zones = (response.data?.data ?? [])
          .map(value => String(value).trim())
          .filter(Boolean)
        const uniqueZones = [...new Set(zones)]
        setZoneOptions([
          { value: '', label: 'Toutes les zones' },
          ...uniqueZones.map(value => ({
            value,
            label: ZONE_LABELS[value] || value,
          })),
        ])
      })
      .catch(() => {
        setZoneOptions([{ value: '', label: 'Toutes les zones' }])
      })
  }, [])

  const handleSearch = e => {
    e.preventDefault()
    performSearch()
  }

  return (
    <div className="search-container page-content">
      <div className="search-header">
        <h1>🔍 Découvrez nos équipements connectés</h1>
        <p>Explorez les objets intelligents disponibles dans notre réseau</p>
      </div>

      <div className="search-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Rechercher par nom ou description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            Rechercher
          </button>
        </form>

        <div className="filters-row">
          <select
            value={typeObjet}
            onChange={e => setTypeObjet(e.target.value)}
            className="filter-select"
          >
            {TYPE_OBJET_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={statut}
            onChange={e => setStatut(e.target.value)}
            className="filter-select"
          >
            {STATUT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={zone}
            onChange={e => setZone(e.target.value)}
            className="filter-select"
          >
            {zoneOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : !searched ? (
        <div className="no-results">
          <p>Utilisez les filtres ci-dessus et cliquez sur Rechercher.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="no-results">
          <p>Aucun équipement trouvé avec ces critères.</p>
        </div>
      ) : (
        <>
          <div className="results-count">
            <p>{results.length} équipement(s) trouvé(s)</p>
          </div>

          <div className="results-grid">
            {results.map(obj => (
              <div key={obj.id} className="object-card">
                <div className="card-header">
                  <div className="card-title">{obj.nom}</div>
                  <span
                    className="statut-badge"
                    style={{ backgroundColor: getStatutColor(obj.statut) }}
                  >
                    {obj.statut}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Type:</span>
                    <span className="value">{obj.type_objet}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Zone:</span>
                    <span className="value">{obj.zone}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Marque:</span>
                    <span className="value">{obj.marque || 'N/A'}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Catégorie:</span>
                    <span className="value">{obj.category_nom || 'N/A'}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Connectivité:</span>
                    <span className="value">{obj.connectivite}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Signal:</span>
                    <span className="value">{obj.signal_force}</span>
                  </div>

                  {obj.description && (
                    <div className="description">
                      <p>{obj.description}</p>
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="card-footer">
                    <p className="login-prompt">
                      📌 Connectez-vous pour voir plus de détails
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
