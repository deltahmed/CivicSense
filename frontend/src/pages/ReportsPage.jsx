import React, { useState, useEffect } from 'react';
import UsageLineChart from '../components/charts/UsageLineChart';
import ZoneBarChart from '../components/charts/ZoneBarChart';
import TypePieChart from '../components/charts/TypePieChart';

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [zone, setZone] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const params = new URLSearchParams();
        params.append('period', period);
        if (zone) params.append('zone', zone);
        
        const response = await fetch(`/api/reports/usage/?${params.toString()}`);
        const result = await response.json();
        if (result.success) {
          setReportData(result);
          if (result.objects_data.length > 0 && !selectedObjectId) {
              setSelectedObjectId(result.objects_data[0].id);
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    fetchReportData();
  }, [period, zone]);

  useEffect(() => {
    const fetchHistoryData = async () => {
      if (!selectedObjectId) return;
      try {
        const response = await fetch(`/api/objects/${selectedObjectId}/history/?period=${period}`);
        const result = await response.json();
        if (result.success) {
          setHistoryData(result.data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    fetchHistoryData();
  }, [selectedObjectId, period]);

  if (!reportData) return <p>Chargement des rapports...</p>;

  const handleExport = (format) => {
    window.open(`/api/reports/export/?format=${format}&period=${period}`);
  };

  return (
    <div className="reports-page">
      <h1>Rapports d'utilisation & Statistiques</h1>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
        <button onClick={() => handleExport('csv')}
          style={{ padding: '8px 18px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Exporter CSV
        </button>
        <button onClick={() => handleExport('pdf')}
          style={{ padding: '8px 18px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Exporter PDF
        </button>
      </div>

      <div className="filters" style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '15px' }}>
          Période:
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ marginLeft: '5px' }}>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">3 derniers mois</option>
          </select>
        </label>
        <label>
          Zone:
          <input 
            type="text" 
            placeholder="Ex: Salon" 
            value={zone} 
            onChange={(e) => setZone(e.target.value)} 
            style={{ marginLeft: '5px' }}
          />
        </label>
      </div>

      <div className="dashboard-summary">
        <h2>Total Résidence: {reportData.total_residence.toFixed(2)} unités</h2>
      </div>

      <div className="charts-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="chart-item">
          <h3>Comparaison Consommation par Zone</h3>
          <ZoneBarChart data={reportData.zones_data} />
        </div>
        <div className="chart-item">
          <h3>Répartition des types d'objets</h3>
          <TypePieChart data={reportData.types_distribution} />
        </div>
      </div>

      <div className="history-section" style={{ marginTop: '2rem' }}>
        <h3>Évolution de la consommation pour un objet</h3>
        <select value={selectedObjectId} onChange={(e) => setSelectedObjectId(e.target.value)} style={{ marginBottom: '10px' }}>
          <option value="" disabled>Sélectionner un objet</option>
          {reportData.objects_data.map(obj => (
            <option key={obj.id} value={obj.id}>{obj.nom} ({obj.zone})</option>
          ))}
        </select>
        {historyData.length > 0 ? (
          <UsageLineChart data={historyData} />
        ) : (
          <p>Aucune donnée d'historique pour cet objet sur cette période.</p>
        )}
      </div>

      <div className="table-section" style={{ marginTop: '3rem' }}>
        <h2>Top 3 Objets les plus consommateurs</h2>
        <ul>
          {reportData.top_3_objects.map((obj, i) => (
            <li key={i}>{obj.nom} - {obj.total_conso.toFixed(2)} unités (Zone: {obj.zone})</li>
          ))}
        </ul>

        <h2>Récapitulatif des Objets</h2>
        <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px' }}>Nom</th>
              <th style={{ padding: '8px' }}>Type</th>
              <th style={{ padding: '8px' }}>Zone</th>
              <th style={{ padding: '8px' }}>Total Conso</th>
              <th style={{ padding: '8px' }}>Moyenne Conso</th>
              <th style={{ padding: '8px' }}>Interactions (Incidents)</th>
            </tr>
          </thead>
          <tbody>
            {reportData.objects_data.map((obj) => (
              <tr key={obj.id}>
                <td style={{ padding: '8px' }}>{obj.nom}</td>
                <td style={{ padding: '8px' }}>{obj.type_objet}</td>
                <td style={{ padding: '8px' }}>{obj.zone}</td>
                <td style={{ padding: '8px' }}>{obj.total_conso.toFixed(2)}</td>
                <td style={{ padding: '8px' }}>{obj.avg_conso.toFixed(2)}</td>
                <td style={{ padding: '8px' }}>{obj.interactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsPage;