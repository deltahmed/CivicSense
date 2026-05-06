import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import './ObjectAddPage.css'

// ── Options ───────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value:'thermostat', label:'Thermostat' },
  { value:'camera',     label:'Caméra de surveillance' },
  { value:'compteur',   label:'Compteur (eau/énergie)' },
  { value:'eclairage',  label:'Éclairage connecté' },
  { value:'capteur',    label:'Capteur (temp./hum./CO2…)' },
  { value:'prise',      label:'Prise connectée' },
]
const STATUT_OPTIONS = [
  { value:'actif',        label:'Actif' },
  { value:'inactif',      label:'Inactif' },
  { value:'maintenance',  label:'En maintenance' },
]
const CONNECTIVITE_OPTIONS = [
  { value:'wifi',      label:'Wi-Fi' },
  { value:'bluetooth', label:'Bluetooth' },
  { value:'zigbee',    label:'Zigbee' },
  { value:'zwave',     label:'Z-Wave' },
  { value:'ethernet',  label:'Ethernet (filaire)' },
]
const SIGNAL_OPTIONS = [
  { value:'fort',   label:'Fort' },
  { value:'moyen',  label:'Moyen' },
  { value:'faible', label:'Faible' },
]
const MODE_OPTIONS = [
  { value:'automatique', label:'Automatique' },
  { value:'manuel',      label:'Manuel' },
]

// ── Générateur d'ID unique ────────────────────────────────────────────────────
function genUid(type) {
  const prefix = type ? type.slice(0, 3).toUpperCase() : 'OBJ'
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${rand}`
}

// ── Valeur initiale du formulaire ─────────────────────────────────────────────
const INIT = {
  nom: '', unique_id: '', type_objet: 'capteur', zone: '',
  marque: '', description: '', statut: 'actif',
  connectivite: 'wifi', signal_force: 'moyen',
  consommation_kwh: '', batterie: '100',
  mode: 'automatique',
  valeur_actuelle_json: '',
  attributs_specifiques_json: '',
}

// ── Composant champ ───────────────────────────────────────────────────────────
function Field({ label, error, hint, required, children }) {
  return (
    <div className="oa-field">
      <label className="oa-label">
        {label}{required && <span className="oa-required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint  && <p className="oa-hint">{hint}</p>}
      {error && <p className="oa-error" role="alert">{error}</p>}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ObjectAddPage() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ ...INIT, unique_id: genUid('capteur') })
  const [errors, setErrors]   = useState({})
  const [globalErr, setGlobalErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [zones, setZones]     = useState([])

  useEffect(() => {
    api.get('/objects/zones/')
      .then(res => { if (res.data.success) setZones(res.data.data) })
      .catch(() => {})
  }, [])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function handleTypeChange(value) {
    set('type_objet', value)
    set('unique_id', genUid(value))
  }

  function parseJsonField(raw, fieldName) {
    if (!raw.trim()) return [true, {}]
    try { return [true, JSON.parse(raw)] }
    catch { return [false, `${fieldName} : JSON invalide`] }
  }

  function validate() {
    const e = {}
    if (!form.nom.trim())       e.nom       = 'Ce champ est requis.'
    if (!form.unique_id.trim()) e.unique_id = 'Ce champ est requis.'
    if (!form.type_objet)       e.type_objet = 'Sélectionner un type.'
    if (!form.zone.trim())      e.zone      = 'Ce champ est requis.'

    const bat = Number(form.batterie)
    if (form.batterie !== '' && (isNaN(bat) || bat < 0 || bat > 100))
      e.batterie = 'Valeur entre 0 et 100.'

    const kwh = Number(form.consommation_kwh)
    if (form.consommation_kwh !== '' && (isNaN(kwh) || kwh < 0))
      e.consommation_kwh = 'Valeur positive requise.'

    const [okVal] = parseJsonField(form.valeur_actuelle_json, 'Valeur actuelle')
    if (!okVal) e.valeur_actuelle_json = 'JSON invalide.'

    const [okAttr] = parseJsonField(form.attributs_specifiques_json, 'Attributs spécifiques')
    if (!okAttr) e.attributs_specifiques_json = 'JSON invalide.'

    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGlobalErr('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)

    const [, valActuelle]   = parseJsonField(form.valeur_actuelle_json, '')
    const [, attrsSpecif]   = parseJsonField(form.attributs_specifiques_json, '')

    const payload = {
      nom:            form.nom.trim(),
      unique_id:      form.unique_id.trim(),
      type_objet:     form.type_objet,
      zone:           form.zone.trim(),
      marque:         form.marque.trim(),
      description:    form.description.trim(),
      statut:         form.statut,
      connectivite:   form.connectivite,
      signal_force:   form.signal_force,
      mode:           form.mode,
      ...(form.consommation_kwh !== '' && { consommation_kwh: Number(form.consommation_kwh) }),
      ...(form.batterie         !== '' && { batterie: Number(form.batterie) }),
      ...(Object.keys(valActuelle).length  && { valeur_actuelle: valActuelle }),
      ...(Object.keys(attrsSpecif).length  && { attributs_specifiques: attrsSpecif }),
    }

    try {
      const res = await api.post('/objects/', payload)
      setSuccess(res.data.data)
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErrors(data.errors)
      setGlobalErr(data?.message || "Erreur lors de l'enregistrement.")
    } finally {
      setLoading(false)
    }
  }

  // ── Succès ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="oa-page page-content">
        <div className="oa-success-card">
          <div className="oa-success-icon" aria-hidden="true">✅</div>
          <h1 className="oa-success-title">Objet enregistré</h1>
          <p className="oa-success-sub">
            <strong>{success.nom}</strong> a été ajouté à la base de données.
          </p>
          <div className="oa-success-id">ID : {success.unique_id}</div>
          <div className="oa-success-actions">
            <Link to={`/objects/${success.id}`} className="oa-btn oa-btn-primary">
              Voir l'objet
            </Link>
            <Link to="/objects" className="oa-btn oa-btn-outline">
              Retour à la liste
            </Link>
            <button
              className="oa-btn oa-btn-ghost"
              onClick={() => { setSuccess(null); setForm({ ...INIT, unique_id: genUid('capteur') }) }}
            >
              Ajouter un autre
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  return (
    <div className="oa-page page-content">
      {/* En-tête */}
      <div className="oa-header">
        <Link to="/objects" className="oa-back">← Retour aux objets</Link>
        <h1 className="oa-title">Ajouter un objet connecté</h1>
        <p className="oa-subtitle">Enregistrez un nouvel objet connecté dans la résidence.</p>
      </div>

      <form className="oa-form" onSubmit={handleSubmit} noValidate>
        {globalErr && <div className="oa-global-error" role="alert">{globalErr}</div>}

        {/* ── Section 1 : Informations de base ──────────────────────────── */}
        <section className="oa-section">
          <h2 className="oa-section-title">
            <span className="oa-section-num">1</span>
            Informations générales
          </h2>
          <div className="oa-grid-2">
            <Field label="Nom de l'objet" required error={errors.nom}>
              <input
                type="text"
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Ex. : Thermostat salon"
                className={errors.nom ? 'oa-input oa-input-err' : 'oa-input'}
              />
            </Field>

            <Field label="Identifiant unique" required error={errors.unique_id} hint="Auto-généré — modifiable">
              <div className="oa-uid-row">
                <input
                  type="text"
                  value={form.unique_id}
                  onChange={e => set('unique_id', e.target.value)}
                  className={errors.unique_id ? 'oa-input oa-input-err' : 'oa-input'}
                />
                <button
                  type="button"
                  className="oa-btn-regen"
                  onClick={() => set('unique_id', genUid(form.type_objet))}
                  title="Regénérer"
                >↺</button>
              </div>
            </Field>

            <Field label="Type d'objet" required error={errors.type_objet}>
              <select
                value={form.type_objet}
                onChange={e => handleTypeChange(e.target.value)}
                className="oa-input"
              >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Zone / Emplacement" required error={errors.zone} hint="Choisissez une zone existante ou saisissez-en une nouvelle">
              <input
                list="oa-zones-list"
                type="text"
                value={form.zone}
                onChange={e => set('zone', e.target.value)}
                placeholder="Ex. : Couloir 2e étage"
                className={errors.zone ? 'oa-input oa-input-err' : 'oa-input'}
                autoComplete="off"
              />
              <datalist id="oa-zones-list">
                {zones.map(z => <option key={z} value={z} />)}
              </datalist>
            </Field>

            <Field label="Marque" error={errors.marque}>
              <input
                type="text"
                value={form.marque}
                onChange={e => set('marque', e.target.value)}
                placeholder="Ex. : Philips, Netatmo…"
                className="oa-input"
              />
            </Field>

            <Field label="Statut initial" error={errors.statut}>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} className="oa-input">
                {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Description" error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Description optionnelle : rôle, emplacement précis, particularités…"
              rows={3}
              className="oa-input oa-textarea"
            />
          </Field>
        </section>

        {/* ── Section 2 : Connectivité ───────────────────────────────────── */}
        <section className="oa-section">
          <h2 className="oa-section-title">
            <span className="oa-section-num">2</span>
            Attributs connectivité
          </h2>
          <div className="oa-grid-2">
            <Field label="Protocole de connexion" error={errors.connectivite}>
              <select value={form.connectivite} onChange={e => set('connectivite', e.target.value)} className="oa-input">
                {CONNECTIVITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Force du signal" error={errors.signal_force}>
              <select value={form.signal_force} onChange={e => set('signal_force', e.target.value)} className="oa-input">
                {SIGNAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* ── Section 3 : Énergie ───────────────────────────────────────── */}
        <section className="oa-section">
          <h2 className="oa-section-title">
            <span className="oa-section-num">3</span>
            Attributs énergie
          </h2>
          <div className="oa-grid-2">
            <Field label="Consommation (kWh)" error={errors.consommation_kwh} hint="Laissez vide si inconnu">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.consommation_kwh}
                onChange={e => set('consommation_kwh', e.target.value)}
                placeholder="0.00"
                className={errors.consommation_kwh ? 'oa-input oa-input-err' : 'oa-input'}
              />
            </Field>
            <Field label={`Batterie : ${form.batterie} %`} error={errors.batterie}>
              <input
                type="range"
                min="0" max="100"
                value={form.batterie}
                onChange={e => set('batterie', e.target.value)}
                className="oa-range"
              />
              <div className="oa-range-labels"><span>0 %</span><span>50 %</span><span>100 %</span></div>
            </Field>
          </div>
        </section>

        {/* ── Section 4 : Capteurs ──────────────────────────────────────── */}
        <section className="oa-section">
          <h2 className="oa-section-title">
            <span className="oa-section-num">4</span>
            Attributs capteurs
          </h2>
          <Field
            label="Valeurs actuelles (JSON)"
            error={errors.valeur_actuelle_json}
            hint='Optionnel. Format JSON — ex. : {"temperature": 21.5, "humidite": 60}'
          >
            <textarea
              value={form.valeur_actuelle_json}
              onChange={e => set('valeur_actuelle_json', e.target.value)}
              placeholder='{"temperature": 21.5, "humidite": 60}'
              rows={3}
              className={`oa-input oa-textarea oa-monospace${errors.valeur_actuelle_json ? ' oa-input-err' : ''}`}
              spellCheck={false}
            />
          </Field>
        </section>

        {/* ── Section 5 : Usage ─────────────────────────────────────────── */}
        <section className="oa-section">
          <h2 className="oa-section-title">
            <span className="oa-section-num">5</span>
            Attributs usage
          </h2>
          <div className="oa-grid-2">
            <Field label="Mode de fonctionnement" error={errors.mode}>
              <select value={form.mode} onChange={e => set('mode', e.target.value)} className="oa-input">
                {MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <Field
            label="Attributs spécifiques (JSON)"
            error={errors.attributs_specifiques_json}
            hint={"Optionnel. Paramètres propres au type d'objet — ex. : {\"plage_temp\": [16, 26]}"}
          >
            <textarea
              value={form.attributs_specifiques_json}
              onChange={e => set('attributs_specifiques_json', e.target.value)}
              placeholder='{"plage_temp": [16, 26]}'
              rows={3}
              className={`oa-input oa-textarea oa-monospace${errors.attributs_specifiques_json ? ' oa-input-err' : ''}`}
              spellCheck={false}
            />
          </Field>
        </section>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="oa-form-actions">
          <button type="submit" className="oa-btn oa-btn-primary" disabled={loading}>
            {loading ? 'Enregistrement…' : "Enregistrer l'objet"}
          </button>
          <Link to="/objects" className="oa-btn oa-btn-outline">Annuler</Link>
        </div>
      </form>
    </div>
  )
}
