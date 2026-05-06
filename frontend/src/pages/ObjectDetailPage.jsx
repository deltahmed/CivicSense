import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/index'
import './ObjectDetailPage.css'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ZONE_OPTIONS = [
  'Salon', 'Cuisine', 'Chambre', 'Salle de bain', 'Bureau',
  'Entrée', 'Couloir', 'Garage', 'Jardin', 'Cave', 'Extérieur', 'Autre',
].map(z => ({ value: z, label: z }))

const MARQUE_OPTIONS = [
  'Philips Hue', 'Samsung SmartThings', 'Google Nest', 'Amazon Echo',
  'Xiaomi', 'Legrand', 'Somfy', 'Schneider Electric',
  'Siemens', 'Bosch', 'Honeywell', 'ABB', 'Autre',
].map(m => ({ value: m, label: m }))

const TYPE_LABELS = {
  thermostat: 'Thermostat',
  camera: 'Caméra',
  compteur: 'Compteur',
  eclairage: 'Éclairage',
  capteur: 'Capteur',
  prise: 'Prise',
}

const STATUT_OPTIONS = [
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
  { value: 'maintenance', label: 'En maintenance' },
]

const CONNECTIVITE_OPTIONS = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'zwave', label: 'Z-Wave' },
  { value: 'ethernet', label: 'Ethernet' },
]

const SIGNAL_OPTIONS = [
  { value: 'fort', label: 'Fort' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'faible', label: 'Faible' },
]

const INFO_FIELDS = [
  { key: 'nom', label: 'Nom', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'marque', label: 'Marque', type: 'select', options: MARQUE_OPTIONS },
  { key: 'zone', label: 'Zone / Pièce', type: 'select', options: ZONE_OPTIONS, required: true },
  { key: 'statut', label: 'Statut', type: 'select', options: STATUT_OPTIONS },
  { key: 'connectivite', label: 'Connectivité', type: 'select', options: CONNECTIVITE_OPTIONS },
  { key: 'signal_force', label: 'Signal', type: 'select', options: SIGNAL_OPTIONS },
  { key: 'batterie', label: 'Batterie (%)', type: 'number', min: 0, max: 100, step: 1 },
  { key: 'consommation_kwh', label: 'Consommation (kWh)', type: 'number', min: 0, step: 0.01 },
]

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

function buildInfoState(existing) {
  return {
    nom: existing?.nom ?? '',
    description: existing?.description ?? '',
    marque: existing?.marque ?? '',
    zone: existing?.zone ?? '',
    statut: existing?.statut ?? 'actif',
    connectivite: existing?.connectivite ?? 'wifi',
    signal_force: existing?.signal_force ?? 'moyen',
    batterie: existing?.batterie !== undefined && existing?.batterie !== null ? String(existing.batterie) : '',
    consommation_kwh: existing?.consommation_kwh !== undefined && existing?.consommation_kwh !== null ? String(existing.consommation_kwh) : '',
  }
}

function StatusBadge({ status }) {
  if (status === 'saving') return <span className="od-status od-status--saving" aria-live="polite">Sauvegarde…</span>
  if (status === 'saved') return <span className="od-status od-status--saved" aria-live="polite">Enregistré</span>
  if (status === 'error') return <span className="od-status od-status--error" aria-live="polite">Erreur</span>
  return null
}

export default function ObjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const canEdit            = user?.level === 'expert'
  const canRequestDeletion = user?.level === 'avance'

  const [object, setObject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [editableInfo, setEditableInfo] = useState({})
  const [infoStatus, setInfoStatus] = useState('idle')
  const [infoErrorMsg, setInfoErrorMsg] = useState(null)

  const [configValues, setConfigValues] = useState({})
  const [configStatus, setConfigStatus] = useState('idle')
  const [configErrorMsg, setConfigErrorMsg] = useState(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteMotif, setDeleteMotif] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('idle')
  const [deleteError, setDeleteError] = useState(null)

  const [objAlerts, setObjAlerts] = useState([])

  const [objDeletionRequest, setObjDeletionRequest] = useState(null)
  const [showDirectDeleteModal, setShowDirectDeleteModal] = useState(false)
  const [directDelStatus, setDirectDelStatus] = useState('idle')

  useEffect(() => {
    api.get(`/objects/${id}/`)
      .then(res => {
        const obj = res.data.data
        setObject(obj)
        setEditableInfo(buildInfoState(obj))
        const fields = CONFIG_FIELDS[obj.type_objet] || []
        setConfigValues(buildConfigState(fields, obj.attributs_specifiques))
        document.title = `${obj.nom} - CivicSense`
        setLoading(false)
      })
      .catch(() => {
        setFetchError('Objet introuvable ou erreur réseau.')
        setLoading(false)
      })

    if (canEdit) {
      api.get('/objects/alert-rules/', { params: { objet_id: id } })
        .then(res => { if (res.data.success) setObjAlerts(res.data.data) })
        .catch(() => {})
    }

    if (canRequestDeletion) {
      api.get('/deletion-requests/')
        .then(res => {
          if (res.data.success) {
            const dr = res.data.data.find(r => r.objet === Number(id))
            setObjDeletionRequest(dr ?? null)
          }
        })
        .catch(() => {})
    }
  }, [id, canEdit, canRequestDeletion])

  const handleInfoChange = (key, value) => {
    setEditableInfo(prev => ({ ...prev, [key]: value }))
  }

  const handleConfigChange = (key, value) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
  }

  const handleInfoSave = async () => {
    if (!canEdit) return
    setInfoStatus('saving')
    setInfoErrorMsg(null)

    const payload = {
      nom: editableInfo.nom.trim(),
      description: editableInfo.description,
      marque: editableInfo.marque.trim(),
      zone: editableInfo.zone.trim(),
      statut: editableInfo.statut,
      connectivite: editableInfo.connectivite,
      signal_force: editableInfo.signal_force,
    }

    if (editableInfo.batterie !== '') {
      payload.batterie = parseInt(editableInfo.batterie, 10)
    }
    if (editableInfo.consommation_kwh !== '') {
      payload.consommation_kwh = parseFloat(editableInfo.consommation_kwh)
    }

    try {
      const res = await api.patch(`/objects/${id}/`, payload)
      const updated = res.data.data
      setObject(updated)
      setEditableInfo(buildInfoState(updated))
      setInfoStatus('saved')
      setTimeout(() => setInfoStatus('idle'), 2500)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la sauvegarde des informations.'
      setInfoErrorMsg(msg)
      setInfoStatus('error')
      setTimeout(() => { setInfoStatus('idle'); setInfoErrorMsg(null) }, 4000)
    }
  }

  const openDeleteModal = () => {
    setDeleteMotif('')
    setDeleteStatus('idle')
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    if (deleteStatus === 'sending') return
    setShowDeleteModal(false)
  }

  const handleDeleteSubmit = async () => {
    if (!deleteMotif.trim()) {
      setDeleteError('Le motif est obligatoire.')
      return
    }
    setDeleteStatus('sending')
    setDeleteError(null)
    try {
      await api.post('/deletion-requests/', { objet: object.id, motif: deleteMotif.trim() })
      setDeleteStatus('done')
    } catch (err) {
      const msg = err.response?.data?.message || 'Une erreur est survenue.'
      setDeleteError(msg)
      setDeleteStatus('error')
    }
  }

  const handleDirectDelete = async () => {
    setDirectDelStatus('deleting')
    try {
      await api.delete(`/admin/objects/${id}/`)
      navigate('/objects')
    } catch {
      setDirectDelStatus('error')
    }
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
      <div className="od-layout">
        <main className="od-main page-content">
          <p className="od-state od-state--error" role="alert">{fetchError}</p>
          <Link to="/objects" className="od-back">← Retour aux objets</Link>
        </main>
      </div>
    )
  }

  const configFields = CONFIG_FIELDS[object.type_objet] || []

  return (
    <div className="od-layout">
      <main className="od-main page-content">
        <nav aria-label="Fil d'Ariane" className="od-breadcrumb">
          <Link to="/objects">Objets</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{object.nom}</span>
        </nav>
        <Link to="/objects" className="od-back od-back--top">← Retour aux objets</Link>

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

        {canEdit && (
          <section className="od-section" aria-labelledby="edit-info-title">
            <h2 id="edit-info-title">Modifier les informations</h2>
            <fieldset className="od-fieldset">
              <legend>Champs modifiables</legend>
              {INFO_FIELDS.map(field => (
                <div key={field.key} className="od-field-row">
                  <label htmlFor={`info-${field.key}`}>{field.label}</label>
                  <div className="od-field-control">
                    {field.type === 'select' ? (
                      <select
                        id={`info-${field.key}`}
                        value={editableInfo[field.key] ?? ''}
                        onChange={e => handleInfoChange(field.key, e.target.value)}
                        disabled={infoStatus === 'saving'}
                      >
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={`info-${field.key}`}
                        value={editableInfo[field.key] ?? ''}
                        onChange={e => handleInfoChange(field.key, e.target.value)}
                        disabled={infoStatus === 'saving'}
                        rows={4}
                      />
                    ) : (
                      <input
                        id={`info-${field.key}`}
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={editableInfo[field.key] ?? ''}
                        onChange={e => handleInfoChange(field.key, e.target.value)}
                        disabled={infoStatus === 'saving'}
                        required={field.required}
                      />
                    )}
                  </div>
                </div>
              ))}

              <div className="od-save-row">
                <button
                  className="btn-save"
                  onClick={handleInfoSave}
                  disabled={infoStatus === 'saving'}
                  type="button"
                >
                  {infoStatus === 'saving' ? 'Sauvegarde…' : 'Sauvegarder les informations'}
                </button>
                <StatusBadge status={infoStatus} />
                {infoErrorMsg && infoStatus === 'error' && (
                  <span className="od-error-msg" role="alert">{infoErrorMsg}</span>
                )}
              </div>
            </fieldset>
          </section>
        )}

        {/* Configuration */}
        <section className="od-section" aria-labelledby="config-title">
          <h2 id="config-title">Configuration</h2>

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

        {/* Zone actions suppression */}
        {(canRequestDeletion || canEdit) && (
          <div className="od-delete-zone">
            {canEdit && (
              <button
                className="btn-direct-delete"
                onClick={() => { setShowDirectDeleteModal(true); setDirectDelStatus('idle') }}
                type="button"
              >
                Supprimer l'objet
              </button>
            )}
            {canRequestDeletion && (
              objDeletionRequest?.statut === 'en_attente' ? (
                <p className="od-request-pending">
                  Demande de suppression en attente de traitement
                </p>
              ) : objDeletionRequest?.statut === 'refusee' ? (
                <div className="od-request-refused">
                  <p className="od-request-refused-msg">Votre demande de suppression a été refusée.</p>
                  <button className="btn-delete-request" onClick={openDeleteModal} type="button">
                    Soumettre une nouvelle demande
                  </button>
                </div>
              ) : (
                <button className="btn-delete-request" onClick={openDeleteModal} type="button">
                  Demander la suppression
                </button>
              )
            )}
          </div>
        )}

        {/* Alertes associées — visible avancé/expert */}
        {canEdit && (
          <section className="od-section" aria-labelledby="alerts-title">
            <h2 id="alerts-title">Alertes configurées</h2>
            {objAlerts.length === 0 ? (
              <p className="od-no-config">Aucune alerte configurée pour cet objet.</p>
            ) : (
              <ul className="od-alert-list">
                {objAlerts.map(a => (
                  <li key={a.id} className={`od-alert-item od-alert-item--${a.priorite}${a.declenchee ? ' od-alert-item--on' : ''}`}>
                    <div className="od-alert-row">
                      {a.declenchee && <span className="od-alert-fire" aria-label="Déclenchée">⚠</span>}
                      <span className="od-alert-nom">{a.nom}</span>
                      <span className={`od-alert-badge od-alert-badge--${a.priorite}`}>
                        {a.priorite === 'critique' ? 'Critique' : a.priorite === 'moyen' ? 'Moyen' : 'Faible'}
                      </span>
                      {a.declenchee && <span className="od-alert-triggered">Déclenchée</span>}
                      {!a.active && <span className="od-alert-inactive">Inactive</span>}
                    </div>
                    {a.seuil != null && (
                      <p className="od-alert-detail">
                        Condition : valeur {a.operateur === 'gt' ? '>' : a.operateur === 'lt' ? '<' : a.operateur === 'gte' ? '≥' : '≤'} {a.seuil}
                        {a.valeur_comparee != null && <> — Actuel : <strong>{a.valeur_comparee}</strong></>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Historique récent */}
        <section className="od-section" aria-labelledby="histo-title">
          <h2 id="histo-title">Historique récent</h2>
          {object.historique_recent && object.historique_recent.length > 0 ? (
            <div className="od-histo-wrap">
              <table className="od-histo-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col" className="od-histo-val">Valeur (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {object.historique_recent.map(entry => (
                    <tr key={entry.id}>
                      <td>{fmtDate(entry.date)}</td>
                      <td className="od-histo-val">{entry.valeur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="od-no-config">Aucun historique disponible.</p>
          )}
        </section>
      </main>

      {showDirectDeleteModal && (
        <div className="od-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="deldirect-title">
          <div className="od-modal">
            <h2 id="deldirect-title" className="od-modal-title">Supprimer l'objet</h2>
            <p className="od-modal-desc">
              Êtes-vous sûr de vouloir supprimer <strong>{object.nom}</strong> ?
              Cette action est irréversible et supprimera également tout l'historique associé.
            </p>
            {directDelStatus === 'error' && (
              <p className="od-modal-error" role="alert">Erreur lors de la suppression.</p>
            )}
            <div className="od-modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowDirectDeleteModal(false)}
                disabled={directDelStatus === 'deleting'}
                type="button"
              >
                Annuler
              </button>
              <button
                className="btn-modal-submit"
                onClick={handleDirectDelete}
                disabled={directDelStatus === 'deleting'}
                type="button"
              >
                {directDelStatus === 'deleting' ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="od-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="od-modal">
            {deleteStatus === 'done' ? (
              <>
                <p className="od-modal-success" role="status">
                  Votre demande a été envoyée à l'administrateur.
                </p>
                <button className="btn-modal-close" onClick={closeDeleteModal} type="button">
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 id="modal-title" className="od-modal-title">Demander la suppression</h2>
                <p className="od-modal-desc">
                  Objet : <strong>{object.nom}</strong>
                </p>
                <label htmlFor="delete-motif" className="od-modal-label">
                  Motif <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="delete-motif"
                  className="od-modal-textarea"
                  rows={4}
                  placeholder="Décrivez la raison de la demande de suppression…"
                  value={deleteMotif}
                  onChange={e => setDeleteMotif(e.target.value)}
                  disabled={deleteStatus === 'sending'}
                />
                {deleteError && (
                  <p className="od-modal-error" role="alert">{deleteError}</p>
                )}
                <div className="od-modal-actions">
                  <button
                    className="btn-modal-cancel"
                    onClick={closeDeleteModal}
                    type="button"
                    disabled={deleteStatus === 'sending'}
                  >
                    Annuler
                  </button>
                  <button
                    className="btn-modal-submit"
                    onClick={handleDeleteSubmit}
                    type="button"
                    disabled={deleteStatus === 'sending'}
                  >
                    {deleteStatus === 'sending' ? 'Envoi…' : 'Envoyer la demande'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
