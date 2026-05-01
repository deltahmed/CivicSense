import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api'
import '../styles/ServiceDetailPage.css'

// Les 4 services proposés par la résidence
const RESIDENCE_SERVICES = {
  acces: {
    id: 'acces',
    nom: 'Gestion d\'accès',
    description: 'Contrôle des portes, digicodes et accès à la résidence',
    icon: '🚪',
    couleur: '#3b82f6',
    details: 'Ce service vous permet de gérer et suivre tous les accès à la résidence : portes d\'entrée, digicodes, badges d\'accès. Consultez l\'état des points d\'accès et leur historique.',
  },
  energie: {
    id: 'energie',
    nom: 'Consommation d\'énergie',
    description: 'Suivi et optimisation de la consommation électrique',
    icon: '⚡',
    couleur: '#f59e0b',
    details: 'Surveillez la consommation électrique de la résidence. Analysez les données de consommation par zone, identifiez les pics et optimisez l\'efficacité énergétique.',
  },
  eau: {
    id: 'eau',
    nom: 'Consommation d\'eau',
    description: 'Monitoring de la consommation en eau potable',
    icon: '💧',
    couleur: '#06b6d4',
    details: 'Suivez la consommation en eau de la résidence. Visualisez les statistiques de consommation, détectez les fuites potentielles et gérez les ressources en eau.',
  },
  incidents: {
    id: 'incidents',
    nom: 'Signalement d\'incidents',
    description: 'Signaler et suivre les incidents dans la résidence',
    icon: '⚠️',
    couleur: '#ef4444',
    details: 'Signalez les incidents détectés dans la résidence et suivez leur résolution. Gérez les alertes, les maintenances et les interventions nécessaires.',
  },
}

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // Vérifier si c'est un service de la résidence
      const residenceService = RESIDENCE_SERVICES[id]
      
      if (residenceService) {
        setService(residenceService)
        
        // Charger les statistiques pertinentes
        try {
          const [objsRes, incidentsRes, alertsRes] = await Promise.all([
            api.get('/objects/'),
            api.get('/incidents/'),
            id === 'incidents' ? api.get('/objects/alerts/') : Promise.resolve({ data: { data: [] } }),
          ])
          
          const objets = objsRes.data?.data ?? []
          const incidents = incidentsRes.data?.data ?? []
          const alerts = alertsRes.data?.data ?? []
          
          setStats({
            objets: {
              total: objets.length,
              actifs: objets.filter(o => o.statut === 'actif').length,
              inactifs: objets.filter(o => o.statut === 'inactif').length,
              maintenance: objets.filter(o => o.statut === 'maintenance').length,
            },
            incidents: {
              total: incidents.length,
              en_cours: incidents.filter(i => i.statut === 'en_cours' || i.statut === 'signalé').length,
              resolus: incidents.filter(i => i.statut === 'résolu' || i.statut === 'resolu').length,
            },
            alerts: {
              total: alerts.length,
              critiques: alerts.filter(a => a.priorite === 'critique').length,
              moyens: alerts.filter(a => a.priorite === 'moyen').length,
              faibles: alerts.filter(a => a.priorite === 'faible').length,
            },
          })
        } catch (err) {
          console.error('Erreur chargement stats:', err)
        }
      } else {
        // Essayer de charger depuis l'API (pour compatibilité)
        try {
          const res = await api.get(`/services/${id}/`)
          if (res.data.success || res.data.data) {
            setService(res.data.data ?? res.data)
          } else {
            setError('Service introuvable.')
          }
        } catch (err) {
          setError(err.response?.status === 404 ? 'Service introuvable.' : 'Erreur de chargement.')
        }
      }
      
      setLoading(false)
    }
    
    loadData()
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

      <div className="sd-card" style={{ '--service-color': service.couleur || '#378ADD' }}>
        <div className="sd-header">
          <div className="sd-header-icon">{service.icon}</div>
          <div className="sd-header-text">
            <h1 className="sd-title">{service.nom}</h1>
            <p className="sd-description">{service.description}</p>
          </div>
        </div>

        {service.details && (
          <div className="sd-details">
            <p>{service.details}</p>
          </div>
        )}

        {/* Statistiques du service */}
        {stats && (
          <div className="sd-stats-grid">
            {id === 'acces' && (
              <>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.objets.total}</span>
                  <span className="sd-stat-label">Objets connectés</span>
                </div>
                <div className="sd-stat-card sd-stat-card--success">
                  <span className="sd-stat-value">{stats.objets.actifs}</span>
                  <span className="sd-stat-label">Actifs</span>
                </div>
                <div className="sd-stat-card sd-stat-card--warning">
                  <span className="sd-stat-value">{stats.objets.maintenance}</span>
                  <span className="sd-stat-label">En maintenance</span>
                </div>
              </>
            )}
            {id === 'energie' && (
              <>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.objets.total}</span>
                  <span className="sd-stat-label">Capteurs énergie</span>
                </div>
                <div className="sd-stat-card sd-stat-card--success">
                  <span className="sd-stat-value">{stats.objets.actifs}</span>
                  <span className="sd-stat-label">Actifs</span>
                </div>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.alerts.total}</span>
                  <span className="sd-stat-label">Alertes</span>
                </div>
              </>
            )}
            {id === 'eau' && (
              <>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.objets.total}</span>
                  <span className="sd-stat-label">Capteurs eau</span>
                </div>
                <div className="sd-stat-card sd-stat-card--success">
                  <span className="sd-stat-value">{stats.objets.actifs}</span>
                  <span className="sd-stat-label">Actifs</span>
                </div>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.alerts.total}</span>
                  <span className="sd-stat-label">Alertes</span>
                </div>
              </>
            )}
            {id === 'incidents' && (
              <>
                <div className="sd-stat-card">
                  <span className="sd-stat-value">{stats.incidents.total}</span>
                  <span className="sd-stat-label">Total incidents</span>
                </div>
                <div className="sd-stat-card sd-stat-card--warning">
                  <span className="sd-stat-value">{stats.incidents.en_cours}</span>
                  <span className="sd-stat-label">En cours</span>
                </div>
                <div className="sd-stat-card sd-stat-card--success">
                  <span className="sd-stat-value">{stats.incidents.resolus}</span>
                  <span className="sd-stat-label">Résolus</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions rapides */}
        <div className="sd-actions">
          {id === 'acces' && (
            <Link to="/objects" className="sd-action-btn">Voir tous les objets</Link>
          )}
          {id === 'energie' && (
            <Link to="/objects" className="sd-action-btn">Voir les capteurs</Link>
          )}
          {id === 'eau' && (
            <Link to="/objects" className="sd-action-btn">Voir les capteurs</Link>
          )}
          {id === 'incidents' && (
            <Link to="/alerts" className="sd-action-btn">Voir les alertes</Link>
          )}
        </div>
      </div>
    </div>
  )
}
