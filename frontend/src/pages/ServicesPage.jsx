import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import '../styles/ServicesPage.css'

const RESIDENCE_SERVICES = [
  {
    id: 'acces',
    nom: 'Gestion d\'accès',
    description: 'Contrôle des serrures, digicodes et accès à la résidence',
    icon: '🚪',
    couleur: '#3b82f6',
    objectTypes: ['serrure', 'digicode', 'capteur_porte'],
  },
  {
    id: 'energie',
    nom: 'Consommation d\'énergie',
    description: 'Suivi et optimisation de la consommation électrique',
    icon: '⚡',
    couleur: '#f59e0b',
    objectTypes: ['compteur', 'prise', 'eclairage', 'thermostat'],
  },
  {
    id: 'eau',
    nom: 'Consommation d\'eau',
    description: 'Monitoring de la consommation en eau et détection de fuites',
    icon: '💧',
    couleur: '#06b6d4',
    objectTypes: ['compteur_eau', 'capteur_fuite'],
  },
  {
    id: 'dechets',
    nom: 'Gestion des déchets',
    description: 'Calendrier des collectes et suivi du taux de remplissage',
    icon: '♻️',
    couleur: '#22c55e',
    objectTypes: ['capteur_remplissage'],
  },
]

export default function ServicesPage() {
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Services — CivicSense'
    api.get('/objects/')
      .then(res => setObjects(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getStats = (service) => {
    const objs = objects.filter(o =>
      service.objectTypes.some(t => o.type_objet === t)
    )
    return {
      total: objs.length,
      actifs: objs.filter(o => o.statut === 'actif').length,
    }
  }

  return (
    <main className="services-page page-content">
      <div className="services-heading">
        <h1>Services</h1>
        <p className="services-subtitle">Les 4 services connectés de votre résidence</p>
      </div>

      {loading ? (
        <p className="services-loading">Chargement...</p>
      ) : (
        <div className="residence-services-grid">
          {RESIDENCE_SERVICES.map(service => {
            const stats = getStats(service)
            return (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="residence-service-card"
                style={{ '--service-color': service.couleur }}
              >
                <div className="rsc-icon" aria-hidden="true">{service.icon}</div>
                <div className="rsc-content">
                  <h2 className="rsc-nom">{service.nom}</h2>
                  <p className="rsc-desc">{service.description}</p>
                  <div className="rsc-stats">
                    <span>{stats.total} objet{stats.total !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{stats.actifs} actif{stats.actifs !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <span className="rsc-arrow" aria-hidden="true">→</span>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
