import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './AlertsPage.css'

// ── Constantes ────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value: 'surconsommation_energie', label: 'Surconsommation énergie', unite: 'kWh',    hint: 'Déclenche si consommation_kwh de l\'objet dépasse le seuil' },
  { value: 'batterie_faible',         label: 'Batterie faible',         unite: '%',     hint: 'Déclenche si la batterie de l\'objet passe sous le seuil' },
  { value: 'maintenance_requise',     label: 'Maintenance requise',     unite: 'jours', hint: 'Déclenche si l\'objet n\'a pas interagi depuis X jours' },
  { value: 'valeur_capteur',          label: 'Valeur capteur (JSON)',    unite: '',      hint: 'Compare une clé de valeur_actuelle (ex: temperature, co2_ppm)' },
  { value: 'autre',                   label: 'Autre',                   unite: '',      hint: 'Alerte manuelle, ne se déclenche pas automatiquement' },
]
const OP_OPTIONS = [
  { value: 'gt',  label: 'supérieur à (>)' },
  { value: 'lt',  label: 'inférieur à (<)' },
  { value: 'gte', label: 'supérieur ou égal à (≥)' },
  { value: 'lte', label: 'inférieur ou égal à (≤)' },
]
const PRIORITE_OPTIONS = [
  { value: 'faible',   label: 'Faible' },
  { value: 'moyen',    label: 'Moyen' },
  { value: 'critique', label: 'Critique' },
]
const OP_LABELS = { gt: '>', lt: '<', gte: '≥', lte: '≤' }
const EFF_LABEL = { efficace: 'Efficace', 'à surveiller': 'À surveiller', inefficace: 'Inefficace' }

const INIT_FORM = {
  nom: '', description: '', type_alerte: 'surconsommation_energie',
  seuil: '', operateur: 'gt', valeur_cle: '',
  objet_concerne: '', priorite: 'moyen', active: true,
}

// ── Composants utilitaires ────────────────────────────────────────────────────
function PrioriteBadge({ p }) {
  return <span className={`al-badge al-badge--${p}`}>{PRIORITE_OPTIONS.find(o => o.value === p)?.label ?? p}</span>
}

function typeLabel(t) {
  return TYPE_OPTIONS.find(o => o.value === t)?.label ?? t
}

function fmtSeuil(rule) {
  const t = TYPE_OPTIONS.find(o => o.value === rule.type_alerte)
  const unite = t?.unite || ''
  const op = OP_LABELS[rule.operateur] ?? rule.operateur
  if (rule.seuil == null) return null
  const cle = rule.type_alerte === 'valeur_capteur' && rule.valeur_cle ? ` [${rule.valeur_cle}]` : ''
  return `${cle} ${op} ${rule.seuil}${unite}`
}

// ── Modal formulaire ──────────────────────────────────────────────────────────
function AlertModal({ initial, objects, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [form, setForm]     = useState(() => initial
    ? { ...INIT_FORM, ...initial, objet_concerne: initial.objet_concerne ?? '', seuil: initial.seuil ?? '', valeur_cle: initial.valeur_cle ?? '', operateur: initial.operateur ?? 'gt' }
    : { ...INIT_FORM }
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [globalErr, setGlobalErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const typeInfo = TYPE_OPTIONS.find(o => o.value === form.type_alerte)
  const showSeuil = form.type_alerte !== 'autre'
  const showValeurCle = form.type_alerte === 'valeur_capteur'
  const showOperateur = showSeuil

  async function handleSubmit(e) {
    e.preventDefault()
    setGlobalErr('')
    const errs = {}
    if (!form.nom.trim()) errs.nom = 'Requis.'
    if (!form.type_alerte) errs.type_alerte = 'Requis.'
    if (showSeuil && form.seuil !== '' && isNaN(Number(form.seuil))) errs.seuil = 'Nombre attendu.'
    if (showValeurCle && !form.valeur_cle.trim()) errs.valeur_cle = 'Requis pour ce type.'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    const payload = {
      nom:           form.nom.trim(),
      description:   form.description.trim(),
      type_alerte:   form.type_alerte,
      priorite:      form.priorite,
      active:        form.active,
      operateur:     form.operateur,
      valeur_cle:    form.valeur_cle.trim(),
      seuil:         showSeuil && form.seuil !== '' ? Number(form.seuil) : null,
      objet_concerne: form.objet_concerne || null,
    }
    try {
      if (isEdit) {
        const res = await api.patch(`/objects/alert-rules/${initial.id}/`, payload)
        onSave(res.data.data)
      } else {
        const res = await api.post('/objects/alert-rules/', payload)
        onSave(res.data.data)
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) setErrors(data.errors)
      setGlobalErr(data?.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="al-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="al-modal" role="dialog" aria-modal="true">
        <div className="al-modal-header">
          <h2 className="al-modal-title">{isEdit ? "Modifier l'alerte" : "Créer une alerte"}</h2>
          <button className="al-modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {globalErr && <p className="al-global-err" role="alert">{globalErr}</p>}

          <div className="al-modal-grid">
            {/* Nom */}
            <div className="al-field al-field--full">
              <label className="al-label">Nom <span aria-hidden="true">*</span></label>
              <input
                className={`al-input${errors.nom ? ' al-input--err' : ''}`}
                value={form.nom}
                onChange={e => set('nom', e.target.value)}
                placeholder="Ex. : Alerte batterie capteur cave"
              />
              {errors.nom && <p className="al-err">{errors.nom}</p>}
            </div>

            {/* Type */}
            <div className="al-field al-field--full">
              <label className="al-label">Type de déclenchement <span aria-hidden="true">*</span></label>
              <select className="al-input" value={form.type_alerte} onChange={e => set('type_alerte', e.target.value)}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {typeInfo?.hint && <p className="al-field-hint">{typeInfo.hint}</p>}
            </div>

            {/* Clé JSON (valeur_capteur seulement) */}
            {showValeurCle && (
              <div className="al-field">
                <label className="al-label">Clé JSON <span aria-hidden="true">*</span></label>
                <input
                  className={`al-input al-monospace${errors.valeur_cle ? ' al-input--err' : ''}`}
                  value={form.valeur_cle}
                  onChange={e => set('valeur_cle', e.target.value)}
                  placeholder="Ex : temperature, co2_ppm, humidite"
                />
                {errors.valeur_cle && <p className="al-err">{errors.valeur_cle}</p>}
              </div>
            )}

            {/* Opérateur */}
            {showOperateur && (
              <div className="al-field">
                <label className="al-label">Condition</label>
                <select className="al-input" value={form.operateur} onChange={e => set('operateur', e.target.value)}>
                  {OP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Seuil */}
            {showSeuil && (
              <div className="al-field">
                <label className="al-label">
                  Seuil{typeInfo?.unite ? ` (${typeInfo.unite})` : ''}
                </label>
                <input
                  className={`al-input${errors.seuil ? ' al-input--err' : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.seuil}
                  onChange={e => set('seuil', e.target.value)}
                  placeholder="Valeur numérique"
                />
                {errors.seuil && <p className="al-err">{errors.seuil}</p>}
              </div>
            )}

            {/* Priorité */}
            <div className="al-field">
              <label className="al-label">Priorité</label>
              <select className="al-input" value={form.priorite} onChange={e => set('priorite', e.target.value)}>
                {PRIORITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Objet concerné */}
            <div className="al-field">
              <label className="al-label">Objet connecté concerné</label>
              <select className="al-input" value={form.objet_concerne ?? ''} onChange={e => set('objet_concerne', e.target.value)}>
                <option value="">— Aucun objet spécifique —</option>
                {objects.map(o => <option key={o.id} value={o.id}>{o.nom} ({o.zone})</option>)}
              </select>
            </div>

            {/* Description */}
            <div className="al-field al-field--full">
              <label className="al-label">Description</label>
              <textarea
                className="al-input al-textarea"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Description optionnelle…"
              />
            </div>

            {/* Toggle actif */}
            <div className="al-field al-field--full al-field--toggle">
              <label className="al-toggle">
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
                <span className="al-toggle-track" />
                Alerte active
              </label>
            </div>
          </div>

          <div className="al-modal-actions">
            <button type="submit" className="al-btn al-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
            <button type="button" className="al-btn al-btn--ghost" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Onglet 1 : Règles d'alerte (CRUD) ────────────────────────────────────────
function ReglesList() {
  const [rules, setRules]     = useState([])
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/objects/alert-rules/'),
      api.get('/objects/'),
    ]).then(([rRes, oRes]) => {
      if (rRes.data.success) setRules(rRes.data.data)
      if (oRes.data.success) setObjects(oRes.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function handleSave(saved) {
    setRules(prev => {
      const idx = prev.findIndex(r => r.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    setModal(null)
  }

  async function handleDelete() {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await api.delete(`/objects/alert-rules/${confirmDel}/`)
      setRules(prev => prev.filter(r => r.id !== confirmDel))
    } catch { /* ignore */ }
    finally { setDeleting(false); setConfirmDel(null) }
  }

  const triggered = rules.filter(r => r.declenchee && r.active)
  const inactive  = rules.filter(r => !r.active)
  const pending   = rules.filter(r => r.active && !r.declenchee)

  return (
    <div className="al-tab-content">
      <div className="al-tab-header">
        <p className="al-tab-desc">
          {triggered.length > 0 ? (
            <span className="al-tab-warn">{triggered.length} alerte{triggered.length > 1 ? 's' : ''} déclenchée{triggered.length > 1 ? 's' : ''}</span>
          ) : 'Configurez des alertes sur seuil pour vos objets connectés.'}
        </p>
        <button className="al-btn al-btn--primary" onClick={() => setModal('create')}>+ Nouvelle alerte</button>
      </div>

      {loading ? (
        <p className="al-state">Chargement…</p>
      ) : rules.length === 0 ? (
        <p className="al-state">Aucune règle d'alerte configurée.</p>
      ) : (
        <div className="al-rules-list">
          {rules.map(r => (
            <div key={r.id} className={`al-rule-card${r.declenchee ? ' al-rule-card--triggered' : !r.active ? ' al-rule-card--inactive' : ''}`}>
              <div className="al-rule-top">
                <div className="al-rule-left">
                  {r.declenchee && <span className="al-warn-icon" aria-hidden="true">⚠</span>}
                  <span className="al-rule-nom">{r.nom}</span>
                  {r.declenchee && <span className="al-triggered-badge">Déclenchée</span>}
                  {!r.active && <span className="al-inactive-badge">Inactive</span>}
                </div>
                <div className="al-rule-actions">
                  <button className="al-btn-icon" title="Modifier" onClick={() => setModal(r)}>✎</button>
                  <button className="al-btn-icon al-btn-icon--danger" title="Supprimer" onClick={() => setConfirmDel(r.id)}>✕</button>
                </div>
              </div>
              <div className="al-rule-meta">
                <span>{typeLabel(r.type_alerte)}</span>
                {r.seuil != null && <span>Condition : <strong>{fmtSeuil(r)}</strong></span>}
                {r.objet_nom && (
                  <span>
                    Objet : <strong>
                      {r.objet_concerne
                        ? <Link to={`/objects/${r.objet_concerne}`} className="al-obj-link">{r.objet_nom}</Link>
                        : r.objet_nom}
                    </strong>
                    {r.objet_zone ? ` (${r.objet_zone})` : ''}
                  </span>
                )}
                {r.valeur_comparee != null && r.declenchee && (
                  <span className="al-current-val">Valeur actuelle : <strong>{r.valeur_comparee}</strong></span>
                )}
                <PrioriteBadge p={r.priorite} />
              </div>
              {r.description && <p className="al-rule-desc">{r.description}</p>}
            </div>
          ))}
        </div>
      )}

      {(modal === 'create' || (modal && modal.id)) && (
        <AlertModal
          initial={modal === 'create' ? null : modal}
          objects={objects}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDel && (
        <div className="al-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setConfirmDel(null) }}>
          <div className="al-modal al-modal--sm" role="dialog">
            <h2 className="al-modal-title">Supprimer cette alerte ?</h2>
            <p className="al-modal-text">Cette action est irréversible.</p>
            <div className="al-modal-actions">
              <button className="al-btn al-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button className="al-btn al-btn--ghost" onClick={() => setConfirmDel(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet 2 : Surveillance objets (calculé) ──────────────────────────────────
function SurveillanceList() {
  const [objects, setObjects]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterCritical, setFilterCritical] = useState(false)

  useEffect(() => {
    api.get('/objects/alerts/')
      .then(res => { if (res.data.success) setObjects(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filterCritical
    ? objects.filter(o => o.efficacite !== 'efficace' || o.maintenance_conseillee)
    : objects

  return (
    <div className="al-tab-content">
      <div className="al-tab-header">
        <p className="al-tab-desc">Vue calculée en temps réel — efficacité des objets sur 30 jours.</p>
        <label className="al-toggle al-toggle--inline">
          <input type="checkbox" checked={filterCritical} onChange={e => setFilterCritical(e.target.checked)} />
          <span className="al-toggle-track" />
          Critiques uniquement
        </label>
      </div>

      {loading ? (
        <p className="al-state">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="al-state al-state--ok">Aucune anomalie détectée.</p>
      ) : (
        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr>
                <th>Objet</th>
                <th>Zone</th>
                <th>Score</th>
                <th>Efficacité</th>
                <th>Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(obj => (
                <tr key={obj.id}>
                  <td className="al-td-name">
                    <Link to={`/objects/${obj.id}`} className="al-obj-link">{obj.nom}</Link>
                  </td>
                  <td>{obj.zone}</td>
                  <td>{obj.score.toFixed(2)}</td>
                  <td>
                    <span className={`al-eff-badge al-eff--${obj.efficacite.replace(/ /g, '-').replace('à', 'a')}`}>
                      {EFF_LABEL[obj.efficacite] ?? obj.efficacite}
                    </span>
                  </td>
                  <td>
                    {obj.maintenance_conseillee
                      ? <span className="al-maint-badge al-maint--req">Requise</span>
                      : <span className="al-maint-badge al-maint--ok">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AlertsPage() {
  const [tab, setTab] = useState('regles')

  return (
    <div className="al-page page-content">
      <div className="al-heading">
        <h1>Alertes</h1>
        <p className="al-subtitle">Gestion des règles d'alerte et surveillance des objets connectés</p>
      </div>

      <div className="al-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'regles'}
          className={`al-tab${tab === 'regles' ? ' al-tab--active' : ''}`}
          onClick={() => setTab('regles')}
        >
          Règles d'alerte
        </button>
        <button
          role="tab"
          aria-selected={tab === 'surveillance'}
          className={`al-tab${tab === 'surveillance' ? ' al-tab--active' : ''}`}
          onClick={() => setTab('surveillance')}
        >
          Surveillance objets
        </button>
      </div>

      {tab === 'regles' ? <ReglesList /> : <SurveillanceList />}
    </div>
  )
}
