import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api'
import '../styles/ConsoEnergiePage.css'

const PERIOD_LABELS = { '7d': '7 derniers jours', '30d': '30 derniers jours', '90d': '90 derniers jours' }

const TYPE_LABELS = {
  compteur: 'Compteur électrique',
  prise: 'Prise connectée',
  eclairage: 'Éclairage',
  thermostat: 'Thermostat',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="conso-tooltip">
      <p className="conso-tooltip-date">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'valeur' ? 'Période actuelle' : 'Période précédente'} : <strong>{p.value} kWh</strong>
        </p>
      ))}
    </div>
  )
}

function mergeGraphiques(actuel, precedent, days) {
  const map = {}
  actuel.forEach(p => { map[p.date] = { date: p.date, valeur: p.valeur, precedent: null } })
  precedent.forEach((p, i) => {
    const correspondant = actuel[i]
    if (correspondant) {
      map[correspondant.date] = { ...map[correspondant.date], precedent: p.valeur }
    }
  })
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}

export default function ConsoEnergiePage() {
  const [period, setPeriod] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/services/energie/conso/', { params: { period } })
      setData(res.data?.data ?? null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    document.title = 'Consommation d\'énergie — CivicSense'
    loadData()
  }, [loadData])

  const graphData = data ? mergeGraphiques(data.graphique, data.graphique_precedent) : []
  const variation = data?.variation_pct ?? 0
  const variationSign = variation > 0 ? '+' : ''
  const seuilAlerte = data?.seuil_alerte_kwh ? Math.round(data.seuil_alerte_kwh) : null

  return (
    <main className="conso-page conso-page--energie page-content">
      <title>Consommation d'énergie — CivicSense</title>

      <nav className="conso-breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/services">Services</Link>
        <span aria-hidden="true"> / </span>
        <span>Consommation d'énergie</span>
      </nav>

      <header className="conso-header conso-header--energie">
        <div className="conso-header-icon" aria-hidden="true">⚡</div>
        <div>
          <h1>Consommation d'énergie</h1>
          <p>Suivi de la consommation électrique de la résidence</p>
        </div>
      </header>

      {/* Alerte surconsommation */}
      {data?.alerte_active && (
        <div className="conso-alerte" role="alert">
          <span aria-hidden="true">⚠️</span>
          Surconsommation détectée — le seuil autorisé de {seuilAlerte} kWh est dépassé. Vérifiez les équipements actifs.
        </div>
      )}

      {/* Sélecteur de période */}
      <div className="conso-period-bar" role="group" aria-label="Choisir la période">
        {Object.entries(PERIOD_LABELS).map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={`conso-period-btn ${period === val ? 'conso-period-btn--active' : ''}`}
            onClick={() => setPeriod(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {data && (
        <section className="conso-kpi-grid" aria-label="Indicateurs clés">
          <div className="conso-kpi">
            <span className="conso-kpi-value">{data.total_kwh}</span>
            <span className="conso-kpi-unit">kWh</span>
            <span className="conso-kpi-label">Total période</span>
          </div>
          <div className="conso-kpi">
            <span className="conso-kpi-value">{data.moy_journaliere_kwh}</span>
            <span className="conso-kpi-unit">kWh/j</span>
            <span className="conso-kpi-label">Moyenne journalière</span>
          </div>
          <div className="conso-kpi">
            <span className="conso-kpi-value">{data.moy_precedente_kwh}</span>
            <span className="conso-kpi-unit">kWh/j</span>
            <span className="conso-kpi-label">Période précédente</span>
          </div>
          <div className={`conso-kpi ${variation > 10 ? 'conso-kpi--danger' : variation < -5 ? 'conso-kpi--success' : ''}`}>
            <span className="conso-kpi-value">{variationSign}{variation}%</span>
            <span className="conso-kpi-label">Variation vs précédent</span>
          </div>
        </section>
      )}

      {/* Graphique */}
      <section className="conso-chart-section">
        <h2>Évolution de la consommation</h2>

        {loading ? (
          <div className="conso-chart-placeholder">Chargement...</div>
        ) : !data || graphData.length === 0 ? (
          <div className="conso-chart-placeholder">Aucune donnée disponible pour cette période.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={graphData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEnergie" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEnergiePrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} unit=" kWh" width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => v === 'valeur' ? 'Actuel' : 'Précédent'} />
              {seuilAlerte && (
                <ReferenceLine
                  y={seuilAlerte / 30}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'Seuil', position: 'right', fontSize: 11, fill: '#ef4444' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="precedent"
                stroke="#94a3b8"
                fill="url(#gradEnergiePrev)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="valeur"
                stroke="#f59e0b"
                fill="url(#gradEnergie)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Objets */}
      {data?.objets?.length > 0 && (
        <section className="conso-section">
          <h2>Objets énergétiques</h2>
          <ul className="conso-objets-list">
            {data.objets.map(obj => (
              <li key={obj.id} className="conso-objet-card">
                <div className="conso-objet-info">
                  <span className="conso-objet-nom">{obj.nom}</span>
                  <div className="conso-objet-meta">
                    <span>{TYPE_LABELS[obj.type_objet] ?? obj.type_objet}</span>
                    <span>·</span>
                    <span>{obj.zone}</span>
                    <span className={`conso-badge conso-badge--${obj.statut}`}>
                      {obj.statut === 'actif' ? 'Actif' : obj.statut === 'inactif' ? 'Inactif' : 'Maintenance'}
                    </span>
                  </div>
                </div>
                <div className="conso-objet-conso">
                  <span className="conso-objet-value">{obj.consommation_kwh}</span>
                  <span className="conso-objet-unit">kWh</span>
                </div>
                <Link to={`/objects/${obj.id}`} className="conso-link-btn">Voir</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
