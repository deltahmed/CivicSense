import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserCard from '../components/UserCard'
import './PublicUsersPage.css'

const LEVEL_CHOICES = ['debutant', 'avance', 'expert']
const TYPE_MEMBRE_CHOICES = ['resident', 'gestionnaire', 'expert_energie']

export default function PublicUsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filtres
  const [filters, setFilters] = useState({
    type_membre: '',
    level: ''
  })

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (filters.type_membre) params.append('type_membre', filters.type_membre)
        if (filters.level) params.append('level', filters.level)
        
        const url = `/api/users/${params.toString() ? '?' + params.toString() : ''}`
        const response = await fetch(url, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login')
            return
          }
          throw new Error('Erreur lors du chargement des utilisateurs')
        }
        
        const data = await response.json()
        setUsers(data.data || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [filters, navigate])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetFilters = () => {
    setFilters({
      type_membre: '',
      level: ''
    })
  }

  return (
    <div className="public-users-page">
      <main className="public-users-main">
        <div className="public-users-heading">
          <h1>Répertoire des membres</h1>
          <p className="subtitle">Consultez les profils publics de nos membres</p>
        </div>
        {/* Filtres */}
        <section className="filters-section" aria-label="Filtres de recherche">
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="type_membre-filter">Type de membre</label>
              <select
                id="type_membre-filter"
                value={filters.type_membre}
                onChange={(e) => handleFilterChange('type_membre', e.target.value)}
                className="filter-select"
              >
                <option value="">Tous</option>
                {TYPE_MEMBRE_CHOICES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="level-filter">Niveau</label>
              <select
                id="level-filter"
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="filter-select"
              >
                <option value="">Tous</option>
                {LEVEL_CHOICES.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {(filters.type_membre || filters.level) && (
              <button
                onClick={resetFilters}
                className="btn-reset-filters"
                aria-label="Réinitialiser les filtres"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </section>

        {/* Contenu */}
        {loading ? (
          <div className="loading-message">Chargement...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : users.length === 0 ? (
          <div className="empty-message">
            <p>Aucun utilisateur correspondant à votre recherche.</p>
          </div>
        ) : (
          <section className="users-grid-section">
            <p className="results-count">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            <div className="users-grid">
              {users.map(u => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}
      </main>

    </div>
  )
}
