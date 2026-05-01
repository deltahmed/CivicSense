import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
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

export default function GestionPage() {
  const [triggeredRules, setTriggeredRules]         = useState([])
  const [inefficientObjects, setInefficientObjects] = useState([])
  const [allObjects, setAllObjects]                 = useState([])
  const [alertedObjectIds, setAlertedObjectIds]     = useState(new Set())
  const [loading, setLoading]                       = useState(true)

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

  useEffect(() => {
    document.title = 'Gestion — CivicSense'
    load()
  }, [load])

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
                        <td className="gp-td-name">
                          <Link to={`/objects/${obj.id}`} className="gp-obj-link">
                            {alertedObjectIds.has(obj.id) && <span className="gp-warn-icon-sm" aria-hidden="true">⚠ </span>}
                            {obj.nom}
                          </Link>
                        </td>
                        <td>{obj.zone}</td>
                        <td>
                          <span className={`gp-eff-badge gp-eff--${obj.efficacite.replace(/ /g, '-').replace('à', 'a')}`}>
                            {obj.efficacite === 'à surveiller' ? 'À surveiller' : obj.efficacite === 'inefficace' ? 'Inefficace' : obj.efficacite}
                          </span>
                        </td>
                        <td>
                          {obj.maintenance_conseillee
                            ? <span className="gp-maint gp-maint--req">Requise</span>
                            : <span className="gp-maint gp-maint--ok">OK</span>}
                        </td>
                        <td className="gp-score">{obj.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
