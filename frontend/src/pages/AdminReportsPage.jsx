import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api'
import './AdminReportsPage.css'

const PRIO_COLORS = { critique: '#dc3545', moyen: '#fd7e14', faible: '#6c757d' }
const TYPE_LABELS_ALERT = {
  surconsommation_energie: 'Surconsommation énergie',
  batterie_faible:         'Batterie faible',
  maintenance_requise:     'Maintenance requise',
  valeur_capteur:          'Valeur capteur',
  autre:                   'Autre',
}
const OP_LABELS = { gt: '>', lt: '<', gte: '≥', lte: '≤' }

const PERIODS = [
  { value: '7d',  label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
]

const PIE_COLORS = ['#3A7BD5', '#00C49F', '#FFBB28', '#FF6B6B']

export default function AdminReportsPage() {
  const [period, setPeriod]               = useState('30d')
  const [stats, setStats]                 = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [triggeredAlerts, setTriggeredAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  useEffect(() => {
    api.get('/objects/alert-rules/triggered/')
      .then(res => { if (res.data.success) setTriggeredAlerts(res.data.data) })
      .catch(() => {})
      .finally(() => setAlertsLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get(`/admin/stats/?period=${period}`)
      .then(res => { if (res.data.success) setStats(res.data); else setError('Erreur serveur.') })
      .catch(() => setError('Impossible de contacter le serveur.'))
      .finally(() => setLoading(false))
  }, [period])

  function handleExport(fmt) {
    api.get(`/admin/stats/export/?fmt=${fmt}&period=${period}`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `civicsense_stats_${period}.${fmt}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .catch(() => alert('Export indisponible'))
  }

  if (loading) return <p className="ar-loading">Chargement…</p>
  if (error)   return <p className="ar-error">{error}</p>
  if (!stats)  return null

  const niveauxData = stats.niveaux_utilisateurs.map(n => ({ name: n.level, value: n.count }))

  return (
    <div className="ar-page">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="ar-header">
        <h1 className="ar-title">Rapports Admin</h1>
        <div className="ar-actions">
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`ar-period-btn${period === p.value ? ' ar-period-btn--active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
          <button className="ar-btn ar-btn--csv" onClick={() => handleExport('csv')}>
            Exporter en CSV
          </button>
          <button className="ar-btn ar-btn--pdf" onClick={() => handleExport('pdf')}>
            Exporter en PDF
          </button>
        </div>
      </div>

      {/* ── Cartes résumé ────────────────────────────────────────────────────── */}
      <div className="ar-cards">
        {[
          { label: 'Connexions',        value: stats.total_connexions },
          { label: 'Conso (kWh)',        value: stats.conso_totale_kwh.toFixed(2) },
          { label: 'Incidents ouverts',  value: stats.incidents.ouverts },
          { label: 'Incidents résolus',  value: stats.incidents.resolus },
        ].map(c => (
          <div key={c.label} className="ar-card">
            <div className="ar-card__value">{c.value}</div>
            <div className="ar-card__label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Connexions par semaine ────────────────────────────────────────────── */}
      <section className="ar-section">
        <h2 className="ar-section__title">Connexions par semaine</h2>
        {stats.connexions_semaine.length === 0
          ? <p className="ar-empty">Aucune donnée sur la période.</p>
          : <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.connexions_semaine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="connexions" stroke="#3A7BD5" strokeWidth={2} dot={false} name="Connexions" />
              </LineChart>
            </ResponsiveContainer>
        }
      </section>

      {/* ── Consommation énergie par semaine ─────────────────────────────────── */}
      <section className="ar-section">
        <h2 className="ar-section__title">Consommation énergie par semaine (kWh)</h2>
        {stats.conso_semaine.length === 0
          ? <p className="ar-empty">Aucune donnée sur la période.</p>
          : <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.conso_semaine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conso" fill="#00C49F" name="kWh" />
              </BarChart>
            </ResponsiveContainer>
        }
      </section>

      {/* ── Répartition niveaux ───────────────────────────────────────────────── */}
      <section className="ar-section">
        <h2 className="ar-section__title">Répartition des niveaux utilisateurs</h2>
        {niveauxData.length === 0
          ? <p className="ar-empty">Aucune donnée.</p>
          : <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={niveauxData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {niveauxData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
        }
      </section>

      {/* ── Top 5 objets ─────────────────────────────────────────────────────── */}
      <section className="ar-section">
        <h2 className="ar-section__title">Top 5 objets consultés</h2>
        <div className="ar-table-wrap">
          <table className="ar-table">
            <thead>
              <tr>
                {['Nom', 'Zone', 'Nb entrées', 'Conso (kWh)'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {stats.top_objets.length === 0
                ? <tr><td colSpan="4" className="ar-table__empty">Aucune donnée</td></tr>
                : stats.top_objets.map((o, i) => (
                    <tr key={i}>
                      <td>{o.objet__nom}</td>
                      <td>{o.objet__zone || '—'}</td>
                      <td>{o.nb_entrees}</td>
                      <td>{(o.total_conso || 0).toFixed(2)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Alertes déclenchées ───────────────────────────────────────────────── */}
      <section className="ar-section">
        <div className="ar-section__title-wrap">
          <h2 className="ar-section__title" style={{ margin: 0 }}>Alertes déclenchées</h2>
          {triggeredAlerts.length > 0 && (
            <span className="ar-alert-count">{triggeredAlerts.length}</span>
          )}
        </div>
        {alertsLoading ? (
          <p className="ar-empty">Chargement…</p>
        ) : triggeredAlerts.length === 0 ? (
          <p className="ar-no-alerts">Aucune alerte déclenchée actuellement.</p>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr className="ar-head--danger">
                  {['Priorité', 'Nom', 'Type', 'Objet concerné', 'Zone', 'Valeur actuelle', 'Seuil'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {triggeredAlerts.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'ar-row--alert-odd' : 'ar-row--alert-even'}>
                    <td>
                      <span className={`ar-badge ar-badge--${a.priorite}`}>{a.priorite}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.nom}</td>
                    <td>{TYPE_LABELS_ALERT[a.type_alerte] ?? a.type_alerte}</td>
                    <td>{a.objet_nom ?? '—'}</td>
                    <td>{a.objet_zone ?? '—'}</td>
                    <td style={{ fontWeight: 700, color: '#dc3545' }}>
                      {a.valeur_comparee != null
                        ? `${a.valeur_comparee}${
                            a.type_alerte === 'batterie_faible' ? ' %'
                            : a.type_alerte === 'surconsommation_energie' ? ' kWh'
                            : a.valeur_cle === 'temperature' ? ' °C'
                            : a.valeur_cle === 'co2_ppm' ? ' ppm'
                            : ''}`
                        : '—'}
                    </td>
                    <td>
                      {a.seuil != null
                        ? `${OP_LABELS[a.operateur] ?? a.operateur} ${a.seuil}${
                            a.valeur_cle === 'temperature' ? ' °C'
                            : a.type_alerte === 'batterie_faible' ? ' %'
                            : a.type_alerte === 'surconsommation_energie' ? ' kWh'
                            : ''}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Top 5 services ───────────────────────────────────────────────────── */}
      <section className="ar-section">
        <h2 className="ar-section__title">Top 5 services</h2>
        <div className="ar-table-wrap">
          <table className="ar-table">
            <thead>
              <tr>
                {['Nom', 'Catégorie', 'Objets liés'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {stats.top_services.length === 0
                ? <tr><td colSpan="3" className="ar-table__empty">Aucune donnée</td></tr>
                : stats.top_services.map((s, i) => (
                    <tr key={i}>
                      <td>{s.nom}</td>
                      <td>{s.categorie}</td>
                      <td>{s.nb_objets}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
