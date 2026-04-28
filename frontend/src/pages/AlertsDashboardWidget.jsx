import React, { useState, useEffect } from 'react';

const AlertsDashboardWidget = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/objects/alerts/')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // On ne garde que les alertes sévères pour le widget "rapide"
          const activeAlerts = data.data.filter(
            o => o.efficacite === 'inefficace' || o.maintenance_conseillee
          );
          setAlerts(activeAlerts);
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="alerts-widget" style={{ border: '2px solid red', padding: '15px', borderRadius: '8px', background: '#ffe6e6' }}>
      <h3 style={{ color: 'red', marginTop: 0 }}>🚨 Alertes Actives ({alerts.length})</h3>
      {alerts.length === 0 ? (
        <p style={{ color: 'green', fontWeight: 'bold' }}>Aucune alerte critique en cours.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {alerts.slice(0, 5).map(obj => (
            <li key={obj.id} style={{ marginBottom: '5px' }}>
              <strong>{obj.nom} ({obj.zone})</strong> : 
              {obj.maintenance_conseillee ? ' Maintenance urgente' : ` Rendement inefficace`}
            </li>
          ))}
        </ul>
      )}
      {alerts.length > 5 && <p style={{ fontSize: '0.9em', color: 'gray' }}>...et {alerts.length - 5} autres objets.</p>}
    </div>
  );
};

export default AlertsDashboardWidget;