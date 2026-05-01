import { useState, useEffect } from 'react'
import api from '../api'
import UsageLineChart from '../components/charts/UsageLineChart'
import ZoneBarChart from '../components/charts/ZoneBarChart'
import TypePieChart from '../components/charts/TypePieChart'
import './ReportsPage.css'

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [period, setPeriod] = useState('30d')
  const [zone, setZone] = useState('')
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (zone) params.append('zone', zone)
    api.get(`/reports/usage/?${params}`)
      .then(res => {
        if (res.data.success) {
          setReportData(res.data)
          if (res.data.objects_data.length > 0 && !selectedObjectId) {
            setSelectedObjectId(res.data.objects_data[0].id)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period, zone])

  useEffect(() => {
    if (!selectedObjectId) return
    api.get(`/objects/${selectedObjectId}/history/?period=${period}`)
      .then(res => { if (res.data.success) setHistoryData(res.data.data) })
      .catch(() => {})
  }, [selectedObjectId, period])

  const handleExport = (format) => {
    window.open(`/api/reports/export/?format=${format}&period=${period}`)
  }

  if (loading) return <div className="reports-page page-content"><p className="reports-state">Chargement...</p></div>
  if (!reportData) return <div className="reports-page page-content"><p className="reports-state">Données indisponibles.</p></div>

  return (
    <div className="reports-page page-content">
      <div className="reports-heading">
        <h1>Rapports &amp; Statistiques</h1>
        <p className="reports-subtitle">Consommation et efficacité de la résidence</p>
      </div>

      <div className="reports-toolbar">
        <div className="reports-filters">
          <div className="rfilter-group">
            <label htmlFor="r-period">Période</label>
            <select id="r-period" value={period} onChange={e => setPeriod(e.target.value)} className="rfilter-select">
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">3 derniers mois</option>
            </select>
          </div>
          <div className="rfilter-group">
            <label htmlFor="r-zone">Zone</label>
            <input
              id="r-zone"
              type="text"
              placeholder="Ex: Salon"
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="rfilter-input"
            />
          </div>
        </div>
        <div className="reports-exports">
          <button onClick={() => handleExport('csv')} className="btn-export btn-export-csv">CSV</button>
          <button onClick={() => handleExport('pdf')} className="btn-export btn-export-pdf">PDF</button>
        </div>
      </div>

      <div className="reports-stat-banner">
        <span className="rsb-label">Total résidence</span>
        <span className="rsb-value">{reportData.total_residence.toFixed(2)} unités</span>
      </div>

      <div className="reports-charts">
        <div className="reports-chart-card">
          <h3>Consommation par zone</h3>
          <ZoneBarChart data={reportData.zones_data} />
        </div>
        <div className="reports-chart-card">
          <h3>Répartition des types</h3>
          <TypePieChart data={reportData.types_distribution} />
        </div>
      </div>

      <div className="reports-section">
        <h2>Évolution d'un objet</h2>
        <select
          value={selectedObjectId}
          onChange={e => setSelectedObjectId(e.target.value)}
          className="rfilter-select"
        >
          <option value="" disabled>Sélectionner un objet</option>
          {reportData.objects_data.map(obj => (
            <option key={obj.id} value={obj.id}>{obj.nom} ({obj.zone})</option>
          ))}
        </select>
        {historyData.length > 0
          ? <UsageLineChart data={historyData} />
          : <p className="reports-state-sm">Aucune donnée sur cette période.</p>}
      </div>

      <div className="reports-section">
        <h2>Top 3 — objets les plus consommateurs</h2>
        <ol className="reports-top3">
          {reportData.top_3_objects.map((obj, i) => (
            <li key={i}>
              <span className="top3-name">{obj.nom}</span>
              <span className="top3-meta">{obj.total_conso.toFixed(2)} unités · {obj.zone}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="reports-section">
        <h2>Récapitulatif des objets</h2>
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Nom</th><th>Type</th><th>Zone</th>
                <th>Total</th><th>Moyenne</th><th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {reportData.objects_data.map(obj => (
                <tr key={obj.id}>
                  <td className="rt-name">{obj.nom}</td>
                  <td>{obj.type_objet}</td>
                  <td>{obj.zone}</td>
                  <td>{obj.total_conso.toFixed(2)}</td>
                  <td>{obj.avg_conso.toFixed(2)}</td>
                  <td>{obj.interactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
