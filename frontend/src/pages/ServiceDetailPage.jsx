import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ServiceDetailPage.css';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchService();
  }, [id]);

  const fetchService = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/services/services/${id}/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Service not found');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setService(data);
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement du service:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors = {
    energie: '#FF6B6B',
    securite: '#4ECDC4',
    confort: '#45B7D1',
    information: '#FFA07A',
  };

  const levelBadges = {
    debutant: 'Débutant',
    intermediaire: 'Intermédiaire',
    avance: 'Avancé',
    expert: 'Expert',
  };

  if (loading) {
    return <div className="service-detail loading-state">Chargement...</div>;
  }

  if (error || !service) {
    return (
      <div className="service-detail">
        <button className="back-button" onClick={() => navigate('/services')}>
          ← Retour
        </button>
        <div className="error-message">{error || 'Service non trouvé'}</div>
      </div>
    );
  }

  const categoryColor = categoryColors[service.categorie] || '#999';
  const levelLabel = levelBadges[service.niveau_requis] || service.niveau_requis;

  return (
    <div className="service-detail">
      <button className="back-button" onClick={() => navigate('/services')}>
        ← Retour à la liste
      </button>

      <div className="service-detail-card">
        <div className="detail-header">
          <div>
            <h1 className="detail-title">{service.nom}</h1>
            <p className="detail-description">{service.description}</p>
          </div>
          <span
            className="detail-category-badge"
            style={{ backgroundColor: categoryColor }}
          >
            {service.categorie}
          </span>
        </div>

        <div className="detail-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Niveau requis:</span>
            <span className="metadata-value">{levelLabel}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Consultations:</span>
            <span className="metadata-value">{service.action_count || 0}</span>
          </div>
        </div>

        {service.objets_lies && service.objets_lies.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">Objets liés</h2>
            <div className="objets-grid">
              {service.objets_lies.map((obj) => (
                <div key={obj.id} className="objet-card">
                  <h3 className="objet-name">{obj.nom}</h3>
                  <p className="objet-description">{obj.description}</p>
                  <div className="objet-footer">
                    <span className="objet-type">{obj.type_objet}</span>
                    <span className="objet-category">{obj.categorie}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!service.objets_lies || service.objets_lies.length === 0) && (
          <div className="detail-section empty-section">
            <p>Aucun objet lié à ce service.</p>
          </div>
        )}
      </div>
    </div>
  );
}
