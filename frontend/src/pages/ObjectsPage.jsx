import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './ObjectsPage.css'

export default function ObjectsPage() {
  const { user } = useAuth()
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedObject, setSelectedObject] = useState(null)
  const [showConfig, setShowConfig] = useState(false)

  useEffect(() => {
    fetchObjects()
  }, [])

  async function fetchObjects() {
    try {
      const response = await api.get('/objects/')
      setObjects(response.data.data)
    } catch (err) {
      setError('Erreur lors du chargement des objets')
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'actif': return 'status-active'
      case 'inactif': return 'status-inactive'
      case 'maintenance': return 'status-maintenance'
      default: return 'status-unknown'
    }
  }

  function getConnectivityIcon(connectivite) {
    switch (connectivite) {
      case 'wifi': return '📶'
      case 'bluetooth': return '📱'
      case 'zigbee': return '🏠'
      case 'zwave': return '🌊'
      case 'ethernet': return '🔌'
      default: return '❓'
    }
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="objects-page">
      <header className="page-header">
        <h1>Objets connectés</h1>
        <p>Gérez vos {objects.length} objet{objects.length > 1 ? 's' : ''} connecté{objects.length > 1 ? 's' : ''}</p>
      </header>

      <div className="objects-grid">
        {objects.map(obj => (
          <article key={obj.id} className="object-card">
            <header className="object-header">
              <div className="object-info">
                <h3>{obj.nom}</h3>
                <p className="object-type">{obj.type_objet}</p>
                <p className="object-zone">📍 {obj.zone}</p>
              </div>
              <div className="object-status">
                <span className={`status-badge ${getStatusColor(obj.statut)}`}>
                  {obj.statut}
                </span>
                <span className="connectivity-icon" title={obj.connectivite}>
                  {getConnectivityIcon(obj.connectivite)}
                </span>
              </div>
            </header>

            <div className="object-details">
              {obj.batterie !== null && (
                <div className="detail-item">
                  <span>Batterie</span>
                  <span>{obj.batterie}% 🔋</span>
                </div>
              )}
              <div className="detail-item">
                <span>Consommation</span>
                <span>{obj.consommation_kwh} kWh ⚡</span>
              </div>
              {obj.derniere_interaction && (
                <div className="detail-item">
                  <span>Dernière interaction</span>
                  <span>{new Date(obj.derniere_interaction).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>

            <footer className="object-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedObject(obj)
                  setShowConfig(false)
                }}
              >
                Détails
              </button>
              {['avance', 'expert'].includes(user?.level) && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSelectedObject(obj)
                    setShowConfig(true)
                  }}
                >
                  Configurer
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>

      {selectedObject && !showConfig && (
        <ObjectDetailsModal
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
        />
      )}

      {selectedObject && showConfig && (
        <ObjectConfigModal
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
          onUpdate={fetchObjects}
        />
      )}
    </div>
  )
}

function ObjectDetailsModal({ object, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Détails de {object.nom}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-group">
              <h3>Informations générales</h3>
              <dl>
                <dt>ID unique</dt><dd>{object.unique_id}</dd>
                <dt>Nom</dt><dd>{object.nom}</dd>
                <dt>Type</dt><dd>{object.type_objet}</dd>
                <dt>Marque</dt><dd>{object.marque || 'N/A'}</dd>
                <dt>Zone</dt><dd>{object.zone}</dd>
                <dt>Statut</dt><dd>{object.statut}</dd>
              </dl>
            </div>

            <div className="detail-group">
              <h3>Connectivité</h3>
              <dl>
                <dt>Type</dt><dd>{object.connectivite}</dd>
                <dt>Force du signal</dt><dd>{object.signal_force} dBm</dd>
                <dt>Dernière interaction</dt>
                <dd>{object.derniere_interaction ? new Date(object.derniere_interaction).toLocaleString('fr-FR') : 'Jamais'}</dd>
              </dl>
            </div>

            <div className="detail-group">
              <h3>État actuel</h3>
              <dl>
                <dt>Consommation</dt><dd>{object.consommation_kwh} kWh</dd>
                {object.batterie !== null && <><dt>Batterie</dt><dd>{object.batterie}%</dd></>}
                <dt>Mode</dt><dd>{object.mode || 'N/A'}</dd>
              </dl>
            </div>

            {Object.keys(object.attributs_specifiques).length > 0 && (
              <div className="detail-group">
                <h3>Paramètres spécifiques</h3>
                <dl>
                  {Object.entries(object.attributs_specifiques).map(([key, value]) => (
                    <><dt>{key.replace('_', ' ')}</dt><dd>{JSON.stringify(value)}</dd></>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ObjectConfigModal({ object, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    zone: object.zone,
    attributs_specifiques: { ...object.attributs_specifiques }
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Configuration selon le type d'objet
  const configSchemas = {
    'thermostat': {
      temperature_cible: { type: 'number', min: 15, max: 30, unit: '°C', label: 'Température cible' },
      mode: { type: 'select', options: ['auto', 'manuel', 'éco'], label: 'Mode' },
      plage_horaire: { type: 'text', label: 'Plage horaire' }
    },
    'éclairage': {
      luminosite: { type: 'number', min: 0, max: 100, unit: '%', label: 'Luminosité' },
      horaire_allumage: { type: 'time', label: 'Horaire allumage' },
      horaire_extinction: { type: 'time', label: 'Horaire extinction' }
    },
    'capteur co₂': {
      seuil_alerte_ppm: { type: 'number', min: 0, unit: 'ppm', label: 'Seuil alerte CO₂' }
    },
    'compteur': {
      conso_max_autorisee_kwh: { type: 'number', min: 0, unit: 'kWh', label: 'Consommation max autorisée' }
    }
  }

  const currentSchema = configSchemas[object.type_objet.toLowerCase()] || {}

  async function handleZoneChange() {
    setSaving(true)
    setMessage('')
    try {
      await api.patch(`/objects/${object.id}/`, { zone: formData.zone })
      setMessage('✅ Zone mise à jour')
      onUpdate()
    } catch (err) {
      setMessage('❌ Erreur lors de la mise à jour de la zone')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfigChange() {
    setSaving(true)
    setMessage('')
    try {
      await api.patch(`/objects/${object.id}/config/`, {
        attributs_specifiques: formData.attributs_specifiques
      })
      setMessage('✅ Configuration sauvegardée')
      onUpdate()
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erreur lors de la sauvegarde'
      setMessage(`❌ ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  function updateFormData(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function updateAttribut(key, value) {
    setFormData(prev => ({
      ...prev,
      attributs_specifiques: { ...prev.attributs_specifiques, [key]: value }
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content config-modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Configuration de {object.nom}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

          {/* Zone */}
          <div className="config-section">
            <h3>📍 Zone</h3>
            <div className="form-group">
              <label>Zone de l'objet</label>
              <select
                value={formData.zone}
                onChange={e => updateFormData('zone', e.target.value)}
              >
                <option value="Salon">Salon</option>
                <option value="Cuisine">Cuisine</option>
                <option value="Chambre">Chambre</option>
                <option value="Salle de bain">Salle de bain</option>
                <option value="Bureau">Bureau</option>
                <option value="Garage">Garage</option>
                <option value="Jardin">Jardin</option>
                <option value="Entrée">Entrée</option>
              </select>
              <button
                className="btn-save"
                onClick={handleZoneChange}
                disabled={saving || formData.zone === object.zone}
              >
                {saving ? 'Sauvegarde...' : 'Changer zone'}
              </button>
            </div>
          </div>

          {/* Paramètres spécifiques */}
          {Object.keys(currentSchema).length > 0 && (
            <div className="config-section">
              <h3>⚙️ Paramètres {object.type_objet}</h3>
              <div className="config-form">
                {Object.entries(currentSchema).map(([key, config]) => (
                  <div key={key} className="form-group">
                    <label>{config.label}</label>
                    {config.type === 'number' && (
                      <input
                        type="number"
                        min={config.min}
                        max={config.max}
                        value={formData.attributs_specifiques[key] || ''}
                        onChange={e => updateAttribut(key, parseFloat(e.target.value) || 0)}
                        placeholder={`${config.min || 0} - ${config.max || '∞'}`}
                      />
                    )}
                    {config.type === 'select' && (
                      <select
                        value={formData.attributs_specifiques[key] || ''}
                        onChange={e => updateAttribut(key, e.target.value)}
                      >
                        <option value="">Choisir...</option>
                        {config.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {config.type === 'text' && (
                      <input
                        type="text"
                        value={formData.attributs_specifiques[key] || ''}
                        onChange={e => updateAttribut(key, e.target.value)}
                        placeholder="Ex: 08:00-18:00"
                      />
                    )}
                    {config.type === 'time' && (
                      <input
                        type="time"
                        value={formData.attributs_specifiques[key] || ''}
                        onChange={e => updateAttribut(key, e.target.value)}
                      />
                    )}
                    {config.unit && <span className="unit">{config.unit}</span>}
                  </div>
                ))}
              </div>
              <button
                className="btn-save primary"
                onClick={handleConfigChange}
                disabled={saving}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder configuration'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}