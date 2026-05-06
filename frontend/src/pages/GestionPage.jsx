import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './GestionPage.css'

const PRIORITE_LABELS = { faible: 'Faible', moyen: 'Moyen', critique: 'Critique' }
const TYPE_LABELS = {
  surconsommation_energie: 'Surconsommation énergie',
  batterie_faible:         'Batterie faible',
  maintenance_requise:     'Maintenance requise',
  valeur_capteur:          'Valeur capteur',
  autre:                   'Autre',
}
const OP_LABELS = { gt: '>', lt: '<', gte: '≥', lte: '≤' }

function PrioriteBadge({ p }) {
  return <span className={`gp-badge gp-badge--${p}`}>{PRIORITE_LABELS[p] ?? p}</span>
}

function fmtValeur(alert) {
  if (alert.valeur_comparee == null) return null
  const unite =
    alert.type_alerte === 'surconsommation_energie' ? ' kWh' :
    alert.type_alerte === 'batterie_faible'         ? ' %' :
    alert.type_alerte === 'maintenance_requise'     ? ' j' :
    alert.valeur_cle === 'temperature'              ? ' °C' :
    alert.valeur_cle === 'co2_ppm'                  ? ' ppm' :
    alert.valeur_cle === 'humidite'                 ? ' %' : ''
  return `${alert.valeur_comparee}${unite}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function GestionPage() {
  const { user } = useAuth()
  const isExpert = user?.level === 'expert'

  const [triggeredRules, setTriggeredRules]         = useState([])
  const [inefficientObjects, setInefficientObjects] = useState([])
  const [allObjects, setAllObjects]                 = useState([])
  const [alertedObjectIds, setAlertedObjectIds]     = useState(new Set())
  const [loading, setLoading]                       = useState(true)

  const [deletionRequests, setDeletionRequests]     = useState([])
  const [delLoading, setDelLoading]                 = useState(false)
  const [approving, setApproving]                   = useState(null)
  const [refuseModal, setRefuseModal]               = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/objects/alert-rules/'),
      api.get('/objects/alerts/'),
      api.get('/objects/'),
    ]).then(([rRes, oRes, objRes]) => {
      const triggered = rRes.data.success
        ? rRes.data.data.filter(r => r.declenchee && r.active)
        : []
      setTriggeredRules(triggered)
      setAlertedObjectIds(new Set(triggered.map(r => r.objet_concerne).filter(Boolean)))

      if (oRes.data.success) {
        setInefficientObjects(
          oRes.data.data.filter(o => o.efficacite !== 'efficace' || o.maintenance_conseillee)
        )
      }
      if (objRes.data.success) setAllObjects(objRes.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadDeletionRequests = useCallback(() => {
    if (!isExpert) return
    setDelLoading(true)
    api.get('/admin/deletion-requests/', { params: { statut: 'en_attente' } })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results ?? [])
        setDeletionRequests(data)
      })
      .catch(() => {})
      .finally(() => setDelLoading(false))
  }, [isExpert])

  useEffect(() => {
    document.title = 'Gestion — SmartResi'
    load()
    loadDeletionRequests()
  }, [load, loadDeletionRequests])

  const handleApprove = async (pk) => {
    setApproving(pk)
    try {
      await api.put(`/admin/deletion-requests/${pk}/approve/`)
      setDeletionRequests(prev => prev.filter(dr => dr.id !== pk))
    } catch {
      // silently ignore — user can retry
    } finally {
      setApproving(null)
    }
  }

  const openRefuseModal = (dr) => {
    setRefuseModal({ id: dr.id, objet_nom: dr.objet_nom, motif: '', submitting: false, error: null })
  }

  const handleReject = async () => {
    if (!refuseModal.motif.trim()) {
      setRefuseModal(prev => ({ ...prev, error: 'Le motif est obligatoire.' }))
      return
    }
    setRefuseModal(prev => ({ ...prev, submitting: true, error: null }))
    try {
      await api.put(`/admin/deletion-requests/${refuseModal.id}/reject/`, { motif: refuseModal.motif.trim() })
      setDeletionRequests(prev => prev.filter(dr => dr.id !== refuseModal.id))
      setRefuseModal(null)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors du refus.'
      setRefuseModal(prev => ({ ...prev, submitting: false, error: msg }))
    }
  }

  const objectsWithAlerts = allObjects.filter(o => alertedObjectIds.has(o.id))

  return (
    <div className="gp-page page-content">
      <div className="gp-heading">
        <h1>Gestion du complexe</h1>
        <p className="gp-subtitle">Alertes actives et objets nécessitant une intervention</p>
      </div>

      {loading && <p className="gp-state">Chargement…</p>}

      {!loading && (
        <>
          {/* ── Alertes déclenchées ── */}
          <section className="gp-section">
            <div className="gp-section-header">
              <h2 className="gp-section-title">
                Alertes déclenchées
                {triggeredRules.length > 0 && (
                  <span className="gp-count-badge">{triggeredRules.length}</span>
                )}
              </h2>
              <Link to="/alerts" className="gp-link">Gérer les règles →</Link>
            </div>

            {triggeredRules.length === 0 ? (
              <p className="gp-ok-msg">Aucune alerte déclenchée.</p>
            ) : (
              <div className="gp-alert-list">
                {triggeredRules.map(r => (
                  <div key={r.id} className={`gp-alert-card gp-alert-card--${r.priorite}`}>
                    <div className="gp-alert-top">
                      <div className="gp-alert-left">
                        <span className="gp-alert-warn" aria-hidden="true">⚠</span>
                        <span className="gp-alert-nom">{r.nom}</span>
                      </div>
                      <PrioriteBadge p={r.priorite} />
                    </div>
                    <div className="gp-alert-meta">
                      <span>{TYPE_LABELS[r.type_alerte] ?? r.type_alerte}</span>
                      {r.objet_nom && (
                        <span>
                          Objet : <strong>
                            {r.objet_concerne
                              ? <Link to={`/objects/${r.objet_concerne}`} className="gp-obj-link">{r.objet_nom}</Link>
                              : r.objet_nom}
                          </strong>
                        </span>
                      )}
                      {r.valeur_comparee != null && r.seuil != null && (
                        <span className="gp-alert-threshold">
                          Valeur : <strong className="gp-alert-val">{fmtValeur(r)}</strong>
                          {' '}(seuil {OP_LABELS[r.operateur] ?? r.operateur} {r.seuil}{r.type_alerte === 'batterie_faible' ? ' %' : r.type_alerte === 'surconsommation_energie' ? ' kWh' : ''})
                        </span>
                      )}
                    </div>
                    {r.description && <p className="gp-alert-desc">{r.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Objets en alerte ── */}
          {objectsWithAlerts.length > 0 && (
            <section className="gp-section">
              <div className="gp-section-header">
                <h2 className="gp-section-title">
                  Objets en alerte
                  <span className="gp-count-badge">{objectsWithAlerts.length}</span>
                </h2>
              </div>
              <ul className="gp-obj-alert-list">
                {objectsWithAlerts.map(obj => {
                  const alerts = triggeredRules.filter(r => r.objet_concerne === obj.id)
                  const topPrio = alerts.some(a => a.priorite === 'critique') ? 'critique'
                    : alerts.some(a => a.priorite === 'moyen') ? 'moyen' : 'faible'
                  return (
                    <li key={obj.id} className={`gp-obj-alert-item gp-obj-alert-item--${topPrio}`}>
                      <div className="gp-obj-alert-top">
                        <Link to={`/objects/${obj.id}`} className="gp-obj-alert-nom">
                          <span className="gp-warn-icon" aria-hidden="true">⚠</span>
                          {obj.nom}
                        </Link>
                        <span className="gp-obj-zone">{obj.zone}</span>
                      </div>
                      <div className="gp-obj-badges">
                        {alerts.map(a => (
                          <span key={a.id} className={`gp-obj-mini-badge gp-obj-mini-badge--${a.priorite}`}>
                            {TYPE_LABELS[a.type_alerte] ?? a.type_alerte}
                          </span>
                        ))}
                        <span className={`gp-badge gp-badge--${obj.statut}`}>
                          {obj.statut === 'actif' ? 'Actif' : obj.statut === 'inactif' ? 'Inactif' : 'Maintenance'}
                        </span>
                        {obj.batterie < 20 && (
                          <span className="gp-battery-low">🔋 {obj.batterie}%</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* ── Objets inefficaces / maintenance ── */}
          <section className="gp-section">
            <div className="gp-section-header">
              <h2 className="gp-section-title">
                Objets à surveiller (analyse efficacité)
                {inefficientObjects.length > 0 && (
                  <span className="gp-count-badge gp-count-badge--orange">{inefficientObjects.length}</span>
                )}
              </h2>
              <Link to="/objects" className="gp-link">Voir tous les objets →</Link>
            </div>

            {inefficientObjects.length === 0 ? (
              <p className="gp-ok-msg">Tous les objets fonctionnent correctement.</p>
            ) : (
              <div className="gp-obj-table-wrap">
                <table className="gp-table">
                  <thead>
                    <tr>
                      <th>Objet</th>
                      <th>Zone</th>
                      <th>Efficacité</th>
                      <th>Maintenance</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inefficientObjects.map(obj => (
                      <tr key={obj.id} className={alertedObjectIds.has(obj.id) ? 'gp-tr-alerted' : ''}>
                        <td className="gp-td-name" data-label="Objet">
                          <Link to={`/objects/${obj.id}`} className="gp-obj-link">
                            {alertedObjectIds.has(obj.id) && <span className="gp-warn-icon-sm" aria-hidden="true">⚠ </span>}
                            {obj.nom}
                          </Link>
                        </td>
                        <td data-label="Zone">{obj.zone}</td>
                        <td data-label="Efficacité">
                          <span className={`gp-eff-badge gp-eff--${obj.efficacite.replace(/ /g, '-').replace('à', 'a')}`}>
                            {obj.efficacite === 'à surveiller' ? 'À surveiller' : obj.efficacite === 'inefficace' ? 'Inefficace' : obj.efficacite}
                          </span>
                        </td>
                        <td data-label="Maintenance">
                          {obj.maintenance_conseillee
                            ? <span className="gp-maint gp-maint--req">Requise</span>
                            : <span className="gp-maint gp-maint--ok">OK</span>}
                        </td>
                        <td className="gp-score" data-label="Score">{obj.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Demandes de suppression (expert uniquement) ── */}
          {isExpert && (
            <section className="gp-section">
              <div className="gp-section-header">
                <h2 className="gp-section-title">
                  Demandes de suppression
                  {deletionRequests.length > 0 && (
                    <span className="gp-count-badge">{deletionRequests.length}</span>
                  )}
                </h2>
              </div>

              {delLoading && <p className="gp-state">Chargement…</p>}

              {!delLoading && deletionRequests.length === 0 && (
                <p className="gp-ok-msg">Aucune demande de suppression en attente.</p>
              )}

              {!delLoading && deletionRequests.length > 0 && (
                <div className="gp-del-list">
                  {deletionRequests.map(dr => (
                    <div key={dr.id} className="gp-del-item">
                      <div>
                        <div className="gp-del-nom">
                          <Link to={`/objects/${dr.objet}`} className="gp-obj-link">{dr.objet_nom}</Link>
                        </div>
                        <div className="gp-del-meta">
                          Par {dr.demandeur_pseudo} — {fmtDate(dr.created_at)}
                        </div>
                      </div>
                      <div className="gp-del-motif" title={dr.motif}>{dr.motif}</div>
                      <div className="gp-del-actions">
                        <button
                          className="gp-btn-approve"
                          onClick={() => handleApprove(dr.id)}
                          disabled={approving === dr.id}
                          type="button"
                        >
                          {approving === dr.id ? '…' : 'Approuver'}
                        </button>
                        <button
                          className="gp-btn-del"
                          onClick={() => openRefuseModal(dr)}
                          disabled={approving === dr.id}
                          type="button"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="gp-del-hint">
                Approuver supprime définitivement l'objet et notifie l'utilisateur. Refuser lui envoie un email avec le motif.
              </p>
            </section>
          )}
        </>
      )}

      {/* ── Modal refus ── */}
      {refuseModal && (
        <div
          className="gp-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gp-modal-title"
        >
          <div className="gp-modal">
            <div className="gp-modal-header">
              <h2 id="gp-modal-title" className="gp-modal-title">Refuser la demande</h2>
              <button
                className="gp-modal-close"
                onClick={() => setRefuseModal(null)}
                disabled={refuseModal.submitting}
                type="button"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <p className="gp-modal-obj">Objet : <strong>{refuseModal.objet_nom}</strong></p>
            <div className="gp-modal-field">
              <label htmlFor="refuse-motif" className="gp-modal-label">
                Motif du refus <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="refuse-motif"
                className="gp-modal-textarea"
                rows={4}
                placeholder="Expliquez pourquoi la demande est refusée…"
                value={refuseModal.motif}
                onChange={e => setRefuseModal(prev => ({ ...prev, motif: e.target.value }))}
                disabled={refuseModal.submitting}
              />
            </div>
            {refuseModal.error && (
              <p className="gp-err-msg" role="alert">{refuseModal.error}</p>
            )}
            <div className="gp-modal-actions">
              <button
                className="gp-btn-cancel"
                onClick={() => setRefuseModal(null)}
                disabled={refuseModal.submitting}
                type="button"
              >
                Annuler
              </button>
              <button
                className="gp-btn-submit"
                onClick={handleReject}
                disabled={refuseModal.submitting}
                type="button"
              >
                {refuseModal.submitting ? 'Envoi…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
