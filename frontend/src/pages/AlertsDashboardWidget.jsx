import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const TYPE_REASON = {
  surconsommation_energie: 'Surconsommation',
  batterie_faible:         'Batterie faible',
  maintenance_requise:     'Maintenance requise',
  valeur_capteur:          'Valeur capteur',
  autre:                   'Alerte déclenchée',
}

export default function AlertsDashboardWidget() {
  const [items, setItems] = useState([])

  const load = useCallback(() => {
    api.get('/objects/alert-rules/').then(res => {
      if (!res.data.success) return
      const triggered = res.data.data
        .filter(r => r.declenchee && r.active)
        .map(r => ({
          id:      r.id,
          nom:     r.nom,
          reason:  TYPE_REASON[r.type_alerte] ?? 'Alerte déclenchée',
          priorite: r.priorite,
          objet_id: r.objet_concerne,
          objet_nom: r.objet_nom,
        }))
      setItems(triggered)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // Rafraîchit quand l'utilisateur revient sur l'onglet/la fenêtre
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  if (items.length === 0) return <p className="alerts-widget-empty">Aucune alerte déclenchée.</p>

  return (
    <div className="alerts-widget">
      <div className="alerts-widget-header">
        <span className="alerts-widget-title">Alertes déclenchées</span>
        <span className="alerts-widget-count">{items.length}</span>
      </div>
      <ul className="alerts-widget-list">
        {items.slice(0, 6).map(item => (
          <li key={item.id} className="alerts-widget-item">
            <span className="awi-dot" data-priorite={item.priorite} />
            <div className="awi-content">
              <span className="awi-name">{item.nom}</span>
              {item.objet_nom && (
                item.objet_id
                  ? <Link to={`/objects/${item.objet_id}`} className="awi-obj">{item.objet_nom}</Link>
                  : <span className="awi-obj">{item.objet_nom}</span>
              )}
              <span className="awi-reason">{item.reason}</span>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <Link to="/alerts" className="alerts-widget-more">
          +{items.length - 6} autres → voir tout
        </Link>
      )}
    </div>
  )
}
