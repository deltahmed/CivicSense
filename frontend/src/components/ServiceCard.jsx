import { Link } from 'react-router-dom';
import '../styles/ServiceCard.css';

export default function ServiceCard({ service }) {
  const categoryColors = {
    energie: '#FF6B6B',
    securite: '#4ECDC4',
    confort: '#45B7D1',
    information: '#FFA07A',
  };

  const audienceBadges = {
    tout_le_monde: 'Tout le monde',
    residents: 'Résidents',
    visiteurs: 'Visiteurs',
    syndic: 'Syndic / gestion',
  };

  const categoryColor = categoryColors[service.categorie] || '#999';
  const audienceLabel = audienceBadges[service.public_concerne] || service.public_concerne || 'Tout le monde';

  return (
    <Link to={`/services/${service.id}`} className="service-card-link">
      <div className="service-card">
        <div className="service-header">
          <h3 className="service-name">{service.nom}</h3>
          <span
            className="service-category-badge"
            style={{ backgroundColor: categoryColor }}
          >
            {service.categorie}
          </span>
        </div>

        <p className="service-description">{service.description}</p>

        <div className="service-footer">
          <span className="service-level-badge">{audienceLabel}</span>
          <span className="service-action-count">
            👁 {service.action_count || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
