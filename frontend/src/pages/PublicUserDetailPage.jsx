import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './PublicUserDetailPage.css'

export default function PublicUserDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${id}/`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login')
            return
          }
          if (response.status === 404) {
            throw new Error('Utilisateur introuvable')
          }
          throw new Error('Erreur lors du chargement du profil')
        }
        
        const data = await response.json()
        setProfile(data.data)
        setIsOwnProfile(user?.id === parseInt(id))
        setError(null)
      } catch (err) {
        setError(err.message)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    if (id && user) {
      fetchProfile()
    }
  }, [id, user, navigate])

  if (loading) {
    return (
      <div className="public-user-detail-page">
        <div className="loading-message">Chargement du profil...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="public-user-detail-page">
        <div className="error-container">
          <div className="error-message">{error}</div>
          <Link to="/users" className="btn-back">Retour au répertoire</Link>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="public-user-detail-page">
        <div className="empty-message">Profil non disponible</div>
      </div>
    )
  }

  return (
    <div className="public-user-detail-page">
      <main className="detail-main">
        <div className="detail-back">
          <Link to="/users" className="btn-back-link">← Répertoire des membres</Link>
        </div>
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-photo">
              <div className="profile-avatar">{profile.pseudo.charAt(0).toUpperCase()}</div>
            </div>

            <div className="profile-title">
              <h1>{profile.pseudo}</h1>
              <div className="profile-badges">
                <span className="badge badge-level">{profile.level}</span>
                <span className="badge badge-type">{profile.type_membre}</span>
              </div>
            </div>
          </div>

          <div className="profile-info">
            <div className="info-section">
              <h2>Statistiques</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Points</span>
                  <span className="value">{profile.points}</span>
                </div>
                {profile.age && (
                  <div className="info-item">
                    <span className="label">Âge</span>
                    <span className="value">{profile.age} ans</span>
                  </div>
                )}
                {profile.genre && (
                  <div className="info-item">
                    <span className="label">Genre</span>
                    <span className="value">{profile.genre}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Afficher les champs privés uniquement si c'est le profil de l'utilisateur */}
            {isOwnProfile && (
              <div className="info-section private-section">
                <h2>Informations personnelles</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Email</span>
                    <span className="value">{profile.email}</span>
                  </div>
                  {profile.first_name && (
                    <div className="info-item">
                      <span className="label">Prénom</span>
                      <span className="value">{profile.first_name}</span>
                    </div>
                  )}
                  {profile.last_name && (
                    <div className="info-item">
                      <span className="label">Nom</span>
                      <span className="value">{profile.last_name}</span>
                    </div>
                  )}
                  {profile.date_naissance && (
                    <div className="info-item">
                      <span className="label">Date de naissance</span>
                      <span className="value">{new Date(profile.date_naissance).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {profile.date_joined && (
                    <div className="info-item">
                      <span className="label">Membre depuis</span>
                      <span className="value">{new Date(profile.date_joined).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  {profile.login_count !== null && (
                    <div className="info-item">
                      <span className="label">Connexions</span>
                      <span className="value">{profile.login_count}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {isOwnProfile && (
            <div className="profile-actions">
              <Link to="/profile" className="btn-edit">
                Modifier mon profil
              </Link>
            </div>
          )}
        </div>
      </main>

    </div>
  )
}
