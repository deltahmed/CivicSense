import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api'
import '../styles/ServiceDetailPage.css'

const LEVEL_LABEL = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', expert: 'Expert' }

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    api.get(`/services/${id}/`)
      .then(res => setService(res.data.data ?? res.data))
      .catch(err => setError(err.response?.status === 404 ? 'Service introuvable.' : 'Erreur de chargement.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="service-detail page-content"><p className="sd-state">Chargement...</p></div>

  if (error || !service) return (
    <div className="service-detail page-content">
      <Link to="/services" className="sd-back">← Retour</Link>
      <p className="sd-error">{error ?? 'Service non trouvé'}</p>
    </div>
  )

  return (
    <div className="service-detail page-content">
      <Link to="/services" className="sd-back">← Retour aux services</Link>

      <div className="sd-card">
        <div className="sd-header">
          <div className="sd-header-text">
            <h1 className="sd-title">{service.nom}</h1>
            <p className="sd-description">{service.description}</p>
          </div>
          <div className="sd-badges">
            <span className="sd-badge sd-badge-cat">{service.categorie}</span>
            <span className="sd-badge sd-badge-level">{LEVEL_LABEL[service.niveau_requis] ?? service.niveau_requis}</span>
          </div>
        </div>

        <div className="sd-meta">
          <div className="sd-meta-item">
            <span className="sd-meta-label">Consultations</span>
            <span className="sd-meta-value">{service.action_count ?? 0}</span>
          </div>
        </div>

        {service.objets_lies?.length > 0 ? (
          <div className="sd-section">
            <h2>Objets liés</h2>
            <div className="sd-objets-grid">
              {service.objets_lies.map(obj => (
                <div key={obj.id} className="sd-objet-card">
                  <h3>{obj.nom}</h3>
                  {obj.description && <p>{obj.description}</p>}
                  <div className="sd-objet-footer">
                    <span className="sd-badge sd-badge-type">{obj.type_objet}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="sd-empty">Aucun objet lié à ce service.</p>
        )}
      </div>
    </div>
  )
}
