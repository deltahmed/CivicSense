import { useState, useEffect } from 'react';
import ServiceCard from '../components/ServiceCard';
import '../styles/ServicesPage.css';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtres
  const [categorie, setCategorie] = useState('');
  const [niveauRequis, setNiveauRequis] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchServices();
  }, [categorie, niveauRequis, search]);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categorie) params.append('categorie', categorie);
      if (niveauRequis) params.append('niveau_requis', niveauRequis);
      if (search) params.append('search', search);

      const response = await fetch(
        `/api/services/services/?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Authentication required'
            : `HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setServices(data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement des services:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'energie', label: 'Énergie' },
    { value: 'securite', label: 'Sécurité' },
    { value: 'confort', label: 'Confort' },
    { value: 'information', label: 'Information' },
  ];

  const levels = [
    { value: 'debutant', label: 'Débutant' },
    { value: 'intermediaire', label: 'Intermédiaire' },
    { value: 'avance', label: 'Avancé' },
    { value: 'expert', label: 'Expert' },
  ];

  return (
    <div className="services-page">
      <div className="services-header">
        <h1>Rechercher et consulter outils/services</h1>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher par nom ou description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="categorie-filter">Catégorie</label>
            <select
              id="categorie-filter"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="filter-select"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="niveau-filter">Niveau requis</label>
            <select
              id="niveau-filter"
              value={niveauRequis}
              onChange={(e) => setNiveauRequis(e.target.value)}
              className="filter-select"
            >
              <option value="">Tous les niveaux</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="results-info">
        {loading
          ? 'Chargement...'
          : `${services.length} service${services.length !== 1 ? 's' : ''} trouvé${services.length !== 1 ? 's' : ''}`}
      </div>

      {loading ? (
        <div className="loading-message">Chargement des services...</div>
      ) : services.length === 0 ? (
        <div className="no-results-message">
          Aucun service trouvé avec ces critères.
        </div>
      ) : (
        <div className="services-grid">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
