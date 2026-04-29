import { useEffect, useState } from 'react'
import api from '../api'
import './AdminPendingUsersPage.css'

export default function AdminPendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectMotif, setRejectMotif] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadPendingUsers()
  }, [])

  const loadPendingUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/users/pending/')
      setPendingUsers(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId) => {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/admin/users/${userId}/approve/`)
      setSuccess('Utilisateur approuvé avec succès!')
      setPendingUsers(pendingUsers.filter(u => u.id !== userId))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'approbation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser || !rejectMotif.trim()) {
      setError('Veuillez entrer un motif de refus')
      return
    }

    setActionLoading(true)
    setError('')
    try {
      await api.put(`/admin/users/${selectedUser.id}/reject/`, {
        motif: rejectMotif,
      })
      setSuccess('Utilisateur refusé et compte supprimé!')
      setPendingUsers(pendingUsers.filter(u => u.id !== selectedUser.id))
      setShowRejectModal(false)
      setSelectedUser(null)
      setRejectMotif('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du refus')
    } finally {
      setActionLoading(false)
    }
  }

  const openRejectModal = (user) => {
    setSelectedUser(user)
    setShowRejectModal(true)
    setRejectMotif('')
  }

  const closeRejectModal = () => {
    setShowRejectModal(false)
    setSelectedUser(null)
    setRejectMotif('')
  }

  return (
    <div className="admin-pending-container">
      <h1>Approbation des Utilisateurs</h1>

      <div className="page-header">
        <p className="pending-count">
          {pendingUsers.length} utilisateur(s) en attente d'approbation
        </p>
        <button className="btn btn-secondary" onClick={loadPendingUsers} disabled={loading || actionLoading}>
          {loading ? 'Chargement...' : 'Rafraîchir'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-state">
          <p>Chargement des utilisateurs...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="empty-state">
          <p>Aucun utilisateur en attente d'approbation</p>
          <p className="empty-text">Tous les utilisateurs ont été traités!</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Pseudo</th>
                <th>Email</th>
                <th>Type de Membre</th>
                <th>Date d'Inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.pseudo}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-info">
                      {user.type_membre === 'resident'
                        ? 'Résident'
                        : user.type_membre === 'referent'
                          ? 'Référent'
                          : 'Syndic'}
                    </span>
                  </td>
                  <td>{new Date(user.date_joined).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading}
                        aria-label={`Approuver ${user.pseudo}`}
                        title="Approuver cet utilisateur"
                      >
                        ✓ Approuver
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => openRejectModal(user)}
                        disabled={actionLoading}
                        aria-label={`Refuser ${user.pseudo}`}
                        title="Refuser cet utilisateur"
                      >
                        ✗ Refuser
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Refus */}
      {showRejectModal && selectedUser && (
        <div className="modal-overlay" onClick={() => !actionLoading && closeRejectModal()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Refuser l'Inscription</h2>
            <p className="modal-subtitle">
              Utilisateur: <strong>{selectedUser.pseudo}</strong> ({selectedUser.email})
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label htmlFor="motif">Motif de Refus</label>
                <textarea
                  id="motif"
                  value={rejectMotif}
                  onChange={e => setRejectMotif(e.target.value)}
                  placeholder="Exemple: Domaine email non autorisé, données invalides, etc."
                  required
                  minLength="5"
                  maxLength="500"
                  rows="4"
                  aria-label="Motif de refus"
                ></textarea>
                <p className="char-count">
                  {rejectMotif.length}/500 caractères
                </p>
              </div>

              <div className="warning-box">
                <p>
                  <strong>⚠️ Attention:</strong> Le compte de l'utilisateur sera{' '}
                  <strong>définitivement supprimé</strong>. Un email de refus avec le motif lui sera envoyé.
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-danger" disabled={actionLoading || !rejectMotif.trim()}>
                  {actionLoading ? 'Refus en cours...' : 'Refuser et Supprimer'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeRejectModal}
                  disabled={actionLoading}
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
