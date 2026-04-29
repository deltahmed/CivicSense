import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/index'
import './ObjectDetailPage.css'

const ZONES = [
  'Salon', 'Cuisine', 'Chambre', 'Salle de bain', 'Bureau',
  'Entrée', 'Couloir', 'Garage', 'Jardin', 'Cave', 'Extérieur', 'Autre',
]

const TYPE_LABELS = {
  thermostat: 'Thermostat',
  camera: 'Caméra',
  compteur: 'Compteur',
  eclairage: 'Éclairage',
  capteur: 'Capteur',
  prise: 'Prise',
}

const CONFIG_FIELDS = {
  thermostat: [
    { key: 'temperature_cible', label: 'Température cible (°C)', type: 'number', min: 5, max: 35, step: 0.5 },
    {
      key: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'auto', label: 'Automatique' },
        { value: 'manuel', label: 'Manuel' },
      ],
    },
    { key: 'plage_horaire', label: 'Plage horaire', type: 'text', placeholder: 'ex : 08:00–22:00' },
  ],
  eclairage: [
    { key: 'luminosite', label: 'Luminosité (%)', type: 'number', min: 0, max: 100, step: 1 },
    { key: 'horaire_allumage', label: 'Allumage', type: 'time' },
    { key: 'horaire_extinction', label: 'Extinction', type: 'time' },
  ],
  capteur: [
    { key: 'seuil_alerte_ppm', label: 'Seuil alerte CO₂ (ppm)', type: 'number', min: 0, step: 50 },
  ],
  compteur: [
    { key: 'conso_max_autorisee_kwh', label: 'Conso max autorisée (kWh)', type: 'number', min: 0, step: 0.1 },
  ],
}

function buildConfigState(fields, existing) {
  const state = {}
  for (const f of fields) {
    const val = existing?.[f.key]
    state[f.key] = val !== undefined && val !== null ? String(val) : ''
  }
  return state
}

function StatusBadge({ status }) {
  if (status === 'saving') return <span className="od-status od-status--saving" aria-live="polite">Sauvegarde…</span>
  if (status === 'saved') return <span className="od-status od-status--saved" aria-live="polite">Enregistré ✓</span>
  if (status === 'error') return <span className="od-status od-status--error" aria-live="polite">Erreur</span>
  return null
}

export default function ObjectDetailPage() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const canEdit = ['avance', 'expert'].includes(user?.level)

  const [object, setObject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [zone, setZone] = useState('')
  const [zoneStatus, setZoneStatus] = useState('idle')

  const [configValues, setConfigValues] = useState({})
  const [configStatus, setConfigStatus] = useState('idle')
  const [configErrorMsg, setConfigErrorMsg] = useState(null)

  useEffect(() => {
    api.get(`/objects/${id}/`)
      .then(res => {
        const obj = res.data.data
        setObject(obj)
        setZone(obj.zone)
        const fields = CONFIG_FIELDS[obj.type_objet] || []
        setConfigValues(buildConfigState(fields, obj.attributs_specifiques))
        document.title = `${obj.nom} - CivicSense`
        setLoading(false)
      })
      .catch(() => {
        setFetchError('Objet introuvable ou erreur réseau.')
        setLoading(false)
      })
  }, [id])

  const handleZoneChange = async (e) => {
    const newZone = e.target.value
    const prevZone = zone
    setZone(newZone)
    if (!canEdit) return
    setZoneStatus('saving')
    try {
      const res = await api.patch(`/objects/${id}/`, { zone: newZone })
      setObject(res.data.data)
      setZoneStatus('saved')
      setTimeout(() => setZoneStatus('idle'), 2000)
    } catch {
      setZone(prevZone)
      setZoneStatus('error')
      setTimeout(() => setZoneStatus('idle'), 3000)
    }
  }

  const handleConfigChange = (key, value) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
  }

  const handleConfigSave = async () => {
    setConfigStatus('saving')
    setConfigErrorMsg(null)
    const fields = CONFIG_FIELDS[object.type_objet] || []
    const clean = {}
    for (const field of fields) {
      const v = configValues[field.key]
      if (v === '' || v === null || v === undefined) continue
      clean[field.key] = field.type === 'number' ? parseFloat(v) : v
    }
    try {
      const res = await api.patch(`/objects/${id}/config/`, { attributs_specifiques: clean })
      setObject(res.data.data)
      setConfigStatus('saved')
      setTimeout(() => setConfigStatus('idle'), 2500)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la sauvegarde.'
      setConfigErrorMsg(msg)
      setConfigStatus('error')
      setTimeout(() => { setConfigStatus('idle'); setConfigErrorMsg(null) }, 4000)
    }
  }

  if (loading) {
    return (
      <main className="od-page">
        <p className="od-state">Chargement…</p>
      </main>
    )
  }

  if (fetchError) {
    return (
      <main className="od-page">
        <p className="od-state od-state--error" role="alert">{fetchError}</p>
        <Link to="/objects" className="od-back">← Retour aux objets</Link>
      </main>
    )
  }

  const configFields = CONFIG_FIELDS[object.type_objet] || []
  const zoneInList = ZONES.includes(zone)

  return (
    <div className="od-layout">
      <header className="od-header">
        <span className="od-brand">CivicSense</span>
        <nav aria-label="Navigation principale">
          <ul className="nav-links">
            <li><Link to="/">Accueil</Link></li>
            <li><Link to="/objects">Objets</Link></li>
            <li><Link to="/alerts">Alertes</Link></li>
          </ul>
        </nav>
        <button className="btn-logout" onClick={logout}>Déconnexion</button>
      </header>

      <main className="od-main">
        <nav aria-label="Fil d'Ariane" className="od-breadcrumb">
          <Link to="/objects">Objets</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{object.nom}</span>
        </nav>

        <div className="od-title-row">
          <h1>{object.nom}</h1>
          <span className={`od-badge od-badge--${object.statut}`}>
            {object.statut === 'actif' ? 'Actif' : object.statut === 'inactif' ? 'Inactif' : 'En maintenance'}
          </span>
        </div>

        {/* Informations */}
        <section className="od-section" aria-labelledby="info-title">
          <h2 id="info-title">Informations</h2>
          <dl className="od-info-grid">
            <div><dt>Type</dt><dd>{TYPE_LABELS[object.type_objet] || object.type_objet}</dd></div>
            <div><dt>Marque</dt><dd>{object.marque || '—'}</dd></div>
            <div><dt>Identifiant</dt><dd><code>{object.unique_id}</code></dd></div>
            <div><dt>Connectivité</dt><dd>{object.connectivite}</dd></div>
            <div><dt>Signal</dt><dd>{object.signal_force}</dd></div>
            <div><dt>Batterie</dt><dd>{object.batterie} %</dd></div>
            <div><dt>Consommation</dt><dd>{object.consommation_kwh} kWh</dd></div>
            <div><dt>Mode</dt><dd>{object.mode}</dd></div>
          </dl>
        </section>

        {/* Configuration */}
        <section className="od-section" aria-labelledby="config-title">
          <h2 id="config-title">Configuration</h2>

          {/* Zone */}
          <fieldset className="od-fieldset">
            <legend>Zone / Pièce</legend>
            <div className="od-field-row">
              <label htmlFor="zone-select">Pièce</label>
              <div className="od-field-control">
                {canEdit ? (
                  <select
                    id="zone-select"
                    value={zone}
                    onChange={handleZoneChange}
                    disabled={zoneStatus === 'saving'}
                  >
                    {!zoneInList && <option value={zone}>{zone}</option>}
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                ) : (
                  <span className="od-readonly-value">{zone}</span>
                )}
                <StatusBadge status={zoneStatus} />
              </div>
            </div>
          </fieldset>

          {/* Paramètres par type — mode édition */}
          {configFields.length > 0 && canEdit && (
            <fieldset className="od-fieldset">
              <legend>Paramètres — {TYPE_LABELS[object.type_objet]}</legend>

              {configFields.map(field => (
                <div key={field.key} className="od-field-row">
                  <label htmlFor={`cfg-${field.key}`}>{field.label}</label>
                  <div className="od-field-control">
                    {field.type === 'select' ? (
                      <select
                        id={`cfg-${field.key}`}
                        value={configValues[field.key] ?? ''}
                        onChange={e => handleConfigChange(field.key, e.target.value)}
                        disabled={configStatus === 'saving'}
                      >
                        <option value="">— choisir —</option>
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`cfg-${field.key}`}
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                        value={configValues[field.key] ?? ''}
                        onChange={e => handleConfigChange(field.key, e.target.value)}
                        disabled={configStatus === 'saving'}
                      />
                    )}
                  </div>
                </div>
              ))}

              <div className="od-save-row">
                <button
                  className="btn-save"
                  onClick={handleConfigSave}
                  disabled={configStatus === 'saving'}
                >
                  {configStatus === 'saving' ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
                <StatusBadge status={configStatus} />
                {configErrorMsg && configStatus === 'error' && (
                  <span className="od-error-msg" role="alert">{configErrorMsg}</span>
                )}
              </div>
            </fieldset>
          )}

          {/* Paramètres par type — mode lecture seule */}
          {configFields.length > 0 && !canEdit && (
            <fieldset className="od-fieldset od-fieldset--readonly">
              <legend>Paramètres — {TYPE_LABELS[object.type_objet]}</legend>
              <dl className="od-params-dl">
                {configFields.map(field => (
                  <div key={field.key} className="od-param-row">
                    <dt>{field.label}</dt>
                    <dd>
                      {object.attributs_specifiques?.[field.key] !== undefined
                        ? String(object.attributs_specifiques[field.key])
                        : '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </fieldset>
          )}

          {configFields.length === 0 && (
            <p className="od-no-config">Aucun paramètre configurable pour ce type d'objet.</p>
          )}
        </section>
      </main>

      <footer className="od-footer">
        <p>© 2025 CivicSense — Projet ING1</p>
      </footer>
    </div>
  )
}
