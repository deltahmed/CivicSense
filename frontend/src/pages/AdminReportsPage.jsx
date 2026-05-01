import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api';

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
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

const PIE_COLORS = ['#3A7BD5', '#00C49F', '#FFBB28', '#FF6B6B'];

export default function AdminReportsPage() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    api.get('/objects/alert-rules/triggered/')
      .then(res => { if (res.data.success) setTriggeredAlerts(res.data.data) })
      .catch(() => {})
      .finally(() => setAlertsLoading(false))
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/admin/stats/?period=${period}`)
      .then(res => { if (res.data.success) setStats(res.data); else setError('Erreur serveur.'); })
      .catch(() => setError('Impossible de contacter le serveur.'))
      .finally(() => setLoading(false));
  }, [period]);

  const handleExport = (format) => {
    api.get(`/admin/stats/export/?fmt=${format}&period=${period}`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `civicsense_stats_${period}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Export indisponible'));
  };

  if (loading) return <p style={{ padding: '20px' }}>Chargement…</p>;
  if (error)   return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;
  if (!stats)  return null;

  const niveauxData = stats.niveaux_utilisateurs.map(n => ({ name: n.level, value: n.count }));

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Rapports Admin</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid #3A7BD5',
                background: period === p.value ? '#3A7BD5' : 'white',
                color: period === p.value ? 'white' : '#3A7BD5',
                fontWeight: period === p.value ? 'bold' : 'normal' }}>
              {p.label}
            </button>
          ))}
          <button onClick={() => handleExport('csv')}
            style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: '#28a745', color: 'white' }}>
            Export CSV
          </button>
          <button onClick={() => handleExport('pdf')}
            style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: '#dc3545', color: 'white' }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Cartes résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        {[
          { label: 'Connexions', value: stats.total_connexions },
          { label: 'Conso (kWh)', value: stats.conso_totale_kwh.toFixed(2) },
          { label: 'Incidents ouverts', value: stats.incidents.ouverts },
          { label: 'Incidents résolus', value: stats.incidents.resolus },
        ].map(c => (
          <div key={c.label} style={{ background: '#f4f7fb', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#3A7BD5' }}>{c.value}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* LineChart — connexions par semaine */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Connexions par semaine</h2>
        {stats.connexions_semaine.length === 0
          ? <p style={{ color: '#888' }}>Aucune donnée sur la période.</p>
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

      {/* BarChart — conso énergie par semaine */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Consommation énergie par semaine (kWh)</h2>
        {stats.conso_semaine.length === 0
          ? <p style={{ color: '#888' }}>Aucune donnée sur la période.</p>
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

      {/* PieChart — niveaux utilisateurs */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Répartition des niveaux utilisateurs</h2>
        {niveauxData.length === 0
          ? <p style={{ color: '#888' }}>Aucune donnée.</p>
          : <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={niveauxData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, value }) => `${name} (${value})`}>
                  {niveauxData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
        }
      </section>

      {/* Top 5 objets */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Top 5 objets consultés</h2>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#3A7BD5', color: 'white' }}>
            <tr>
              {['Nom', 'Zone', 'Nb entrées', 'Conso (kWh)'].map(h => <th key={h} style={{ padding: '8px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {stats.top_objets.length === 0
              ? <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#888' }}>Aucune donnée</td></tr>
              : stats.top_objets.map((o, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f4f7fb' }}>
                    <td style={{ padding: '8px' }}>{o.objet__nom}</td>
                    <td style={{ padding: '8px' }}>{o.objet__zone || '-'}</td>
                    <td style={{ padding: '8px' }}>{o.nb_entrees}</td>
                    <td style={{ padding: '8px' }}>{(o.total_conso || 0).toFixed(2)}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </section>

      {/* Alertes déclenchées */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Alertes déclenchées
          {triggeredAlerts.length > 0 && (
            <span style={{ background: '#dc3545', color: '#fff', borderRadius: '999px', padding: '2px 10px', fontSize: '13px', fontWeight: 900 }}>
              {triggeredAlerts.length}
            </span>
          )}
        </h2>
        {alertsLoading ? (
          <p style={{ color: '#888' }}>Chargement…</p>
        ) : triggeredAlerts.length === 0 ? (
          <p style={{ color: '#28a745', fontWeight: 600 }}>Aucune alerte déclenchée actuellement.</p>
        ) : (
          <table border="1" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#dc3545', color: 'white' }}>
              <tr>
                {['Priorité', 'Nom', 'Type', 'Objet concerné', 'Zone', 'Valeur actuelle', 'Seuil'].map(h => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {triggeredAlerts.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff8f8' : '#fff0f0' }}>
                  <td style={{ padding: '8px' }}>
                    <span style={{ background: PRIO_COLORS[a.priorite] ?? '#666', color: '#fff', borderRadius: '999px', padding: '2px 8px', fontSize: '12px', fontWeight: 700 }}>
                      {a.priorite}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{a.nom}</td>
                  <td style={{ padding: '8px' }}>{TYPE_LABELS_ALERT[a.type_alerte] ?? a.type_alerte}</td>
                  <td style={{ padding: '8px' }}>{a.objet_nom ?? '—'}</td>
                  <td style={{ padding: '8px' }}>{a.objet_zone ?? '—'}</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: '#dc3545' }}>
                    {a.valeur_comparee != null ? `${a.valeur_comparee}${a.type_alerte === 'batterie_faible' ? ' %' : a.type_alerte === 'surconsommation_energie' ? ' kWh' : a.valeur_cle === 'temperature' ? ' °C' : a.valeur_cle === 'co2_ppm' ? ' ppm' : ''}` : '—'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {a.seuil != null ? `${OP_LABELS[a.operateur] ?? a.operateur} ${a.seuil}${a.valeur_cle === 'temperature' ? ' °C' : a.type_alerte === 'batterie_faible' ? ' %' : a.type_alerte === 'surconsommation_energie' ? ' kWh' : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Top 5 services */}
      <section>
        <h2>Top 5 services</h2>
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#3A7BD5', color: 'white' }}>
            <tr>
              {['Nom', 'Catégorie', 'Objets liés'].map(h => <th key={h} style={{ padding: '8px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {stats.top_services.length === 0
              ? <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center', color: '#888' }}>Aucune donnée</td></tr>
              : stats.top_services.map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f4f7fb' }}>
                    <td style={{ padding: '8px' }}>{s.nom}</td>
                    <td style={{ padding: '8px' }}>{s.categorie}</td>
                    <td style={{ padding: '8px' }}>{s.nb_objets}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </section>

    </div>
  );
}
