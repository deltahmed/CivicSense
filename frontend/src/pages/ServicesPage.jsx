import { useState } from 'react'
import api from '../api'
import ServiceCard from '../components/ServiceCard'
import '../styles/ServicesPage.css'

const CATEGORIES = [
  { value: 'energie',     label: 'Énergie' },
  { value: 'securite',   label: 'Sécurité' },
  { value: 'confort',    label: 'Confort' },
  { value: 'information', label: 'Information' },
]

const LEVELS = [
  { value: 'debutant',      label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance',        label: 'Avancé' },
  { value: 'expert',        label: 'Expert' },
]

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [searched, setSearched] = useState(false)

  const [search,      setSearch]      = useState('')
  const [categorie,   setCategorie]   = useState('')
  const [niveauRequis, setNiveauRequis] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (search)       params.append('search',      search)
      if (categorie)    params.append('categorie',   categorie)
      if (niveauRequis) params.append('niveau_requis', niveauRequis)
      const res = await api.get(`/services/?${params}`)
      setServices(res.data.data ?? [])
    } catch {
      setError('Erreur lors du chargement des services.')
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSearch('')
    setCategorie('')
    setNiveauRequis('')
    setServices([])
    setSearched(false)
  }

  return (
    <div className="services-page page-content">
      <div className="services-heading">
        <h1>Services</h1>
        <p className="services-subtitle">Consultez les services disponibles pour votre niveau</p>
      </div>

      <form className="services-filters" onSubmit={handleSearch}>
        <div className="sf-inputs">
          <input
            type="text"
            placeholder="Rechercher par nom ou description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sf-input"
            aria-label="Recherche textuelle"
          />
          <select value={categorie} onChange={e => setCategorie(e.target.value)} className="sf-select" aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={niveauRequis} onChange={e => setNiveauRequis(e.target.value)} className="sf-select" aria-label="Niveau">
            <option value="">Tous les niveaux</option>
            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="sf-actions">
          <button type="submit" className="sf-btn-search">Rechercher</button>
          {searched && (
            <button type="button" className="sf-btn-reset" onClick={handleReset}>Réinitialiser</button>
          )}
        </div>
      </form>

      {error && <p className="services-error">{error}</p>}

      {!searched ? (
        <div className="services-empty-state">
          <p>Utilisez les filtres ci-dessus pour trouver un service.</p>
        </div>
      ) : loading ? (
        <p className="services-loading">Chargement...</p>
      ) : services.length === 0 ? (
        <p className="services-empty">Aucun service trouvé avec ces critères.</p>
      ) : (
        <>
          <p className="services-count">{services.length} service{services.length > 1 ? 's' : ''}</p>
          <div className="services-grid">
            {services.map(service => <ServiceCard key={service.id} service={service} />)}
          </div>
        </>
      )}
    </div>
  )
}
