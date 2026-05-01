import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api'
import '../styles/ConsoEnergiePage.css'
import '../styles/ConsoEauPage.css'

const PERIOD_LABELS = { '7d': '7 derniers jours', '30d': '30 derniers jours', '90d': '90 derniers jours' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="conso-tooltip">
      <p className="conso-tooltip-date">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'valeur' ? 'Période actuelle' : 'Période précédente'} : <strong>{p.value} L</strong>
        </p>
      ))}
    </div>
  )
}

function mergeGraphiques(actuel, precedent) {
  const map = {}
  actuel.forEach(p => { map[p.date] = { date: p.date, valeur: p.valeur, precedent: null } })
  precedent.forEach((p, i) => {
    const correspondant = actuel[i]
    if (correspondant) map[correspondant.date] = { ...map[correspondant.date], precedent: p.valeur }
  })
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}

export default function ConsoEauPage() {
  const [period, setPeriod] = useState('7d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/services/eau/conso/', { params: { period } })
      setData(res.data?.data ?? null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    document.title = 'Consommation d\'eau — CivicSense'
    loadData()
  }, [loadData])

  const graphData = data ? mergeGraphiques(data.graphique, data.graphique_precedent) : []
  const variation = data?.variation_pct ?? 0
  const variationSign = variation > 0 ? '+' : ''

  return (
    <main className="conso-page page-content">
      <title>Consommation d'eau — CivicSense</title>

      <nav className="conso-breadcrumb" aria-label="Fil d'Ariane">
        <Link to="/services">Services</Link>
        <span aria-hidden="true"> / </span>
        <span>Consommation d'eau</span>
      </nav>

      <header className="conso-header conso-header--eau">
        <div className="conso-header-icon" aria-hidden="true">💧</div>
        <div>
          <h1>Consommation d'eau</h1>
          <p>Monitoring de la consommation en eau et détection de fuites</p>
        </div>
      </header>

      {/* Alerte fuite */}
      {data?.alerte_fuite && (
        <div className="conso-alerte" role="alert">
          <span aria-hidden="true">🚨</span>
          Fuite détectée ! Vérifiez les capteurs en alerte ci-dessous.
        </div>
      )}

      {/* Sélecteur de période */}
      <div className="conso-period-bar" role="group" aria-label="Choisir la période">
        {Object.entries(PERIOD_LABELS).map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={`conso-period-btn ${period === val ? 'conso-period-btn--eau-active' : ''}`}
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
            <span className="conso-kpi-value">{data.total_litres.toLocaleString('fr-FR')}</span>
            <span className="conso-kpi-unit">L</span>
            <span className="conso-kpi-label">Total période</span>
          </div>
          <div className="conso-kpi">
            <span className="conso-kpi-value">{data.moy_journaliere_litres.toLocaleString('fr-FR')}</span>
            <span className="conso-kpi-unit">L/j</span>
            <span className="conso-kpi-label">Moyenne journalière</span>
          </div>
          <div className="conso-kpi">
            <span className="conso-kpi-value">{data.moy_precedente_litres.toLocaleString('fr-FR')}</span>
            <span className="conso-kpi-unit">L/j</span>
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
                <linearGradient id="gradEau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEauPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} unit=" L" width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => v === 'valeur' ? 'Actuel' : 'Précédent'} />
              <Area
                type="monotone"
                dataKey="precedent"
                stroke="#94a3b8"
                fill="url(#gradEauPrev)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="valeur"
                stroke="#06b6d4"
                fill="url(#gradEau)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Capteurs de fuite */}
      {data?.capteurs_fuite?.length > 0 && (
        <section className="conso-section">
          <h2>Capteurs de fuite</h2>
          <div className="conso-fuites-grid">
            {data.capteurs_fuite.map(c => (
              <div
                key={c.id}
                className={`conso-fuite-card ${c.fuite_detectee ? 'conso-fuite-card--alerte' : ''}`}
              >
                <div>
                  <p className="conso-fuite-nom">{c.nom}</p>
                  <p className="conso-fuite-meta">{c.zone} · Humidité {c.humidite_pct}%</p>
                </div>
                <div className={`conso-fuite-status ${c.fuite_detectee ? 'conso-fuite-status--alerte' : 'conso-fuite-status--ok'}`}>
                  {c.fuite_detectee ? '🚨 Fuite!' : '✓ OK'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Compteurs */}
      {data?.compteurs?.length > 0 && (
        <section className="conso-section">
          <h2>Compteurs d'eau</h2>
          <ul className="conso-objets-list">
            {data.compteurs.map(c => (
              <li key={c.id} className="conso-objet-card">
                <div className="conso-objet-info">
                  <span className="conso-objet-nom">{c.nom}</span>
                  <div className="conso-objet-meta">
                    <span>{c.zone}</span>
                    <span className={`conso-badge conso-badge--${c.statut}`}>
                      {c.statut === 'actif' ? 'Actif' : c.statut === 'inactif' ? 'Inactif' : 'Maintenance'}
                    </span>
                  </div>
                </div>
                <Link to={`/objects/${c.id}`} className="conso-link-btn">Voir</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
