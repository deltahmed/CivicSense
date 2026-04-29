import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './ProfilePage.css'

const LEVEL_THRESHOLDS = {
  debutant: 0,
  intermediaire: 1,
  avance: 3,
  expert: 5,
}

const LEVEL_COLORS = {
  debutant: '#6c757d',
  intermediaire: '#17a2b8',
  avance: '#fd7e14',
  expert: '#dc3545',
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [publicProfile, setPublicProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isOwnProfile = true // L'utilisateur voit son propre profil

  // Charger le profil public pour comparaison
  useEffect(() => {
    if (user) {
      api.get(`/users/${user.id}/`)
        .then(res => setPublicProfile(res.data.data))
        .catch(err => console.error('Erreur chargement profil public:', err))
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setFormData({
        pseudo: user.pseudo || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        age: user.age || '',
        genre: user.genre || 'nr',
        date_naissance: user.date_naissance || '',
      })
    }
  }, [user])

  // Calcul de la progression vers le prochain niveau
  const getNextLevel = () => {
    const levels = ['debutant', 'intermediaire', 'avance', 'expert']
    const currentIndex = levels.indexOf(user.level)
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
  }

  const getProgressToNextLevel = () => {
    if (!getNextLevel()) return 100
    const nextLevelThreshold = LEVEL_THRESHOLDS[getNextLevel()]
    const currentThreshold = LEVEL_THRESHOLDS[user.level]
    const progress = ((user.points - currentThreshold) / (nextLevelThreshold - currentThreshold)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }

  const handleTextChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }))
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach(key => {
        if (key !== 'photo' && formData[key] !== '') {
          formDataToSend.append(key, formData[key])
        }
      })
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo)
      }

      const res = await api.patch('/auth/me/', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setUser(res.data.data)
      setIsEditing(false)
      setSuccess('Profil mis à jour avec succès!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    try {
      await api.post('/auth/me/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })

      setSuccess('Mot de passe changé avec succès!')
      setShowPasswordModal(false)
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div className="profile-container"><p>Utilisateur non trouvé</p></div>
  }

  return (
    <div className="profile-container">
      <h1>Mon Profil</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Section Niveau & Points */}
      <section className="profile-section level-section">
        <div className="level-badge-container">
          <div className="level-badge" style={{ backgroundColor: LEVEL_COLORS[user.level] }}>
            <span className="level-text">{user.level.toUpperCase()}</span>
            <span className="points-badge">{user.points.toFixed(2)} pts</span>
          </div>
        </div>

        <div className="progress-container">
          <p className="progress-label">
            Progression vers {getNextLevel() ? getNextLevel().toUpperCase() : 'MAX LEVEL'}
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${getProgressToNextLevel()}%` }}></div>
          </div>
          <p className="progress-text">
            {user.points} / {getNextLevel() ? LEVEL_THRESHOLDS[getNextLevel()] : LEVEL_THRESHOLDS.expert}
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Connexions</span>
            <span className="stat-value">{user.login_count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Actions</span>
            <span className="stat-value">{user.action_count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Inscrit</span>
            <span className="stat-value">{new Date(user.date_joined).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </section>

      {/* Section Profil Public */}
      <section className="profile-section public-section">
        <h2>Profil Public</h2>
        <div className="profile-public-view">
          <div className="avatar-container">
            {user.photo ? (
              <img src={user.photo} alt={user.pseudo} className="avatar" />
            ) : (
              <div className="avatar-placeholder">{user.pseudo.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <div className="public-info">
            <div className="info-item">
              <span className="label">Pseudo</span>
              <span className="value">{user.pseudo}</span>
            </div>
            <div className="info-item">
              <span className="label">Âge</span>
              <span className="value">{user.age || 'Non renseigné'}</span>
            </div>
            <div className="info-item">
              <span className="label">Genre</span>
              <span className="value">
                {user.genre === 'homme' ? 'Homme' : user.genre === 'femme' ? 'Femme' : user.genre === 'autre' ? 'Autre' : 'Non renseigné'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Type de Membre</span>
              <span className="value">{user.type_membre === 'resident' ? 'Résident' : user.type_membre === 'referent' ? 'Référent' : 'Syndic'}</span>
            </div>
            {user.date_naissance && (
              <div className="info-item">
                <span className="label">Date de Naissance</span>
                <span className="value">{new Date(user.date_naissance).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Modifier le Profil
          </button>
        )}
      </section>

      {/* Section Profil Privé (Édition) */}
      {isOwnProfile && isEditing && (
        <section className="profile-section private-section">
          <h2>Édition du Profil</h2>
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="pseudo">Pseudo</label>
              <input
                type="text"
                id="pseudo"
                name="pseudo"
                value={formData.pseudo}
                onChange={handleTextChange}
                required
                aria-label="Pseudo"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">Prénom</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleTextChange}
                  aria-label="Prénom"
                />
              </div>
              <div className="form-group">
                <label htmlFor="last_name">Nom</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleTextChange}
                  aria-label="Nom"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">Âge</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleTextChange}
                  min="1"
                  max="120"
                  aria-label="Âge"
                />
              </div>
              <div className="form-group">
                <label htmlFor="genre">Genre</label>
                <select id="genre" name="genre" value={formData.genre} onChange={handleTextChange}>
                  <option value="nr">Non renseigné</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="date_naissance">Date de Naissance</label>
              <input
                type="date"
                id="date_naissance"
                name="date_naissance"
                value={formData.date_naissance}
                onChange={handleTextChange}
                aria-label="Date de naissance"
              />
            </div>

            <div className="form-group">
              <label htmlFor="photo">Photo de Profil</label>
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoChange}
                aria-label="Photo de profil"
              />
              {formData.photo && (
                <p className="file-info">Fichier sélectionné: {formData.photo.name}</p>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false)
                  setFormData({})
                }}
                disabled={loading}
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Section Sécurité (Profil Privé) */}
      {isOwnProfile && (
        <section className="profile-section security-section">
          <h2>Sécurité</h2>
          <div className="security-info">
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{user.email}</span>
            </div>
            <button className="btn btn-warning" onClick={() => setShowPasswordModal(true)}>
              Changer le Mot de Passe
            </button>
          </div>
        </section>
      )}

      {/* Modal Changement de Mot de Passe */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Changer le Mot de Passe</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="old_password">Ancien Mot de Passe</label>
                <input
                  type="password"
                  id="old_password"
                  value={passwordForm.old_password}
                  onChange={e => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  required
                  aria-label="Ancien mot de passe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="new_password">Nouveau Mot de Passe</label>
                <input
                  type="password"
                  id="new_password"
                  value={passwordForm.new_password}
                  onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  required
                  minLength="8"
                  aria-label="Nouveau mot de passe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirmer le Mot de Passe</label>
                <input
                  type="password"
                  id="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  required
                  minLength="8"
                  aria-label="Confirmation du mot de passe"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Changement...' : 'Changer le Mot de Passe'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={loading}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
