import { useEffect, useState } from 'react'
import api from '../api'
import './AdminPendingUsersPage.css'

const TYPE_LABELS = {
  resident:     'Résident',
  referent:     'Référent',
  gardien:      'Gardien',
  gestionnaire: 'Gestionnaire',
}

export default function AdminPendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectMotif, setRejectMotif] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { loadPendingUsers() }, [])

  const loadPendingUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/users/pending/')
      setPendingUsers(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId) => {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/admin/users/${userId}/approve/`)
      setSuccess('Utilisateur approuvé — un email lui a été envoyé.')
      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'approbation.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser || !rejectMotif.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/admin/users/${selectedUser.id}/reject/`, { motif: rejectMotif })
      setSuccess('Utilisateur refusé — son compte a été supprimé.')
      setPendingUsers(prev => prev.filter(u => u.id !== selectedUser.id))
      closeRejectModal()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du refus.')
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

  function fullName(user) {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
    return user.pseudo
  }

  return (
    <div className="ap-page page-content">
      <div className="ap-header">
        <div>
          <h1 className="ap-title">Approbation des comptes</h1>
          <p className="ap-subtitle">
            {pendingUsers.length} compte{pendingUsers.length !== 1 ? 's' : ''} en attente
          </p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={loadPendingUsers} disabled={loading || actionLoading}>
          Rafraîchir
        </button>
      </div>

      {error   && <div className="ap-alert ap-alert-error">{error}</div>}
      {success && <div className="ap-alert ap-alert-success">{success}</div>}

      {loading ? (
        <p className="ap-state">Chargement…</p>
      ) : pendingUsers.length === 0 ? (
        <div className="ap-empty">
          <span className="ap-empty-icon" aria-hidden="true">✅</span>
          <p>Aucune demande en attente.</p>
        </div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Email</th>
                <th>Type</th>
                <th>Inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map(user => (
                <tr key={user.id}>
                  <td data-label="Nom">
                    <div className="ap-name-cell">
                      <span className="ap-name-full">{fullName(user)}</span>
                      <span className="ap-name-pseudo">@{user.pseudo}</span>
                    </div>
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Type">
                    <span className="ap-badge">{TYPE_LABELS[user.type_membre] ?? user.type_membre}</span>
                  </td>
                  <td data-label="Inscription">
                    {new Date(user.date_joined).toLocaleDateString('fr-FR')}
                  </td>
                  <td data-label="Actions">
                    <div className="ap-actions">
                      <button
                        className="ap-btn ap-btn-approve"
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading}
                      >
                        Approuver
                      </button>
                      <button
                        className="ap-btn ap-btn-reject"
                        onClick={() => openRejectModal(user)}
                        disabled={actionLoading}
                      >
                        Refuser
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRejectModal && selectedUser && (
        <div className="ap-modal-overlay" onClick={() => !actionLoading && closeRejectModal()}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <h2 className="ap-modal-title">Refuser l'inscription</h2>
            <p className="ap-modal-sub">
              <strong>{fullName(selectedUser)}</strong> &mdash; {selectedUser.email}
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="ap-field">
                <label htmlFor="motif">Motif de refus</label>
                <textarea
                  id="motif"
                  value={rejectMotif}
                  onChange={e => setRejectMotif(e.target.value)}
                  placeholder="Ex. : domaine email non autorisé, informations incomplètes…"
                  required
                  minLength="5"
                  maxLength="500"
                  rows="4"
                />
                <span className="ap-char-count">{rejectMotif.length} / 500</span>
              </div>

              <div className="ap-warning">
                Le compte sera <strong>définitivement supprimé</strong> et l'utilisateur recevra un email avec le motif.
              </div>

              <div className="ap-modal-actions">
                <button type="submit" className="ap-btn ap-btn-reject" disabled={actionLoading || !rejectMotif.trim()}>
                  {actionLoading ? 'Refus en cours…' : 'Confirmer le refus'}
                </button>
                <button type="button" className="ap-btn ap-btn-ghost" onClick={closeRejectModal} disabled={actionLoading}>
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
