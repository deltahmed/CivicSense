import React, { useState, useEffect } from 'react';

const AlertsPage = () => {
  const [objects, setObjects] = useState([]);
  const [filterAlerts, setFilterAlerts] = useState(false);

  useEffect(() => {
    fetch('/api/objects/alerts/')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setObjects(data.data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleReport = (id) => {
    // Simulation - Tu pourras lier ça à un POST /api/incidents/ plus tard
    alert(`Une demande de vérification pour l'objet #${id} a été transmise à l'administrateur.`);
  };

  const filteredObjects = filterAlerts 
    ? objects.filter(o => o.efficacite !== 'efficace' || o.maintenance_conseillee)
    : objects;

  const getBadgeColor = (eff) => {
    if (eff === 'efficace') return 'green';
    if (eff === 'à surveiller') return 'darkorange';
    return 'red';
  };

  return (
    <div className="alerts-page">
      <h1>Suivi d'Efficacité et Alertes Maintenance</h1>
      
      <label style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={filterAlerts} 
          onChange={e => setFilterAlerts(e.target.checked)} 
          style={{ marginRight: '10px' }}
        />
        <strong>Afficher uniquement les objets critiques (Inefficaces / À surveiller / Maintenance requise)</strong>
      </label>

      <table border="1" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px' }}>Nom</th>
            <th style={{ padding: '10px' }}>Zone</th>
            <th style={{ padding: '10px' }}>Score Efficacité</th>
            <th style={{ padding: '10px' }}>Statut</th>
            <th style={{ padding: '10px' }}>Maintenance</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredObjects.map(obj => (
            <tr key={obj.id}>
              <td style={{ padding: '10px' }}>{obj.nom}</td>
              <td style={{ padding: '10px' }}>{obj.zone}</td>
              <td style={{ padding: '10px' }}>{obj.score.toFixed(3)}</td>
              <td style={{ padding: '10px', color: getBadgeColor(obj.efficacite), fontWeight: 'bold' }}>
                {obj.efficacite.toUpperCase()}
              </td>
              <td style={{ padding: '10px', color: obj.maintenance_conseillee ? 'red' : 'green' }}>
                {obj.maintenance_conseillee ? '⚠️ Requise (Inactif > 7j)' : '✅ OK'}
              </td>
              <td style={{ padding: '10px' }}>
                {(obj.efficacite !== 'efficace' || obj.maintenance_conseillee) && (
                  <button onClick={() => handleReport(obj.id)}>Signaler à l'admin</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AlertsPage;