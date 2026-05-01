import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getAllUsers,
  updateUser,
  deleteUser,
  setUserLevel,
  setUserPoints,
  getUserHistory,
} from '../api/admin'
import api from '../api'
import './AdminUsersPage.css'

const LEVELS = ['debutant', 'intermediaire', 'avance', 'expert']
const LEVEL_LABELS = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
  expert: 'Expert',
}
const TYPE_LABELS = {
  resident: 'Résident',
  gardien: 'Gardien',
  gestionnaire: 'Gestionnaire',
}
const PAGE_SIZE = 20

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="sort-icon" aria-hidden="true">↕</span>
  return <span className="sort-icon" aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function Modal({ id, title, onClose, children }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="modal">
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [sortField, setSortField] = useState('date_joined')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const [levelModal, setLevelModal] = useState(null)
  const [pointsModal, setPointsModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)

  const [newLevel, setNewLevel] = useState('')
  const [newPoints, setNewPoints] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAllUsers()
      setUsers(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    api.get('/admin/users/pending/')
      .then(res => setPendingCount(res.data.data?.length ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      setLevelModal(null)
      setPointsModal(null)
      setHistoryModal(null)
      setDeleteModal(null)
      setModalError(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const sortedUsers = [...users].sort((a, b) => {
    let va = a[sortField]
    let vb = b[sortField]
    if (sortField === 'level') {
      const order = { debutant: 0, intermediaire: 1, avance: 2, expert: 3 }
      va = order[va] ?? 0
      vb = order[vb] ?? 0
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE)
  const pageUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  // ── Level modal ──────────────────────────────────────────────────────────────
  function openLevelModal(user) {
    setNewLevel(user.level)
    setModalError(null)
    setLevelModal(user)
  }

  async function handleSetLevel() {
    setModalLoading(true)
    setModalError(null)
    try {
      const res = await setUserLevel(levelModal.id, newLevel)
      setUsers(prev => prev.map(u => (u.id === levelModal.id ? res.data.data : u)))
      setLevelModal(null)
    } catch (err) {
      setModalError(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally {
      setModalLoading(false)
    }
  }

  // ── Points modal ─────────────────────────────────────────────────────────────
  function openPointsModal(user) {
    setNewPoints(String(user.points))
    setModalError(null)
    setPointsModal(user)
  }

  async function handleSetPoints() {
    const parsed = parseFloat(newPoints)
    if (isNaN(parsed) || parsed < 0) {
      setModalError('Valeur de points invalide.')
      return
    }
    setModalLoading(true)
    setModalError(null)
    try {
      const res = await setUserPoints(pointsModal.id, parsed)
      setUsers(prev => prev.map(u => (u.id === pointsModal.id ? res.data.data : u)))
      setPointsModal(null)
    } catch (err) {
      setModalError(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally {
      setModalLoading(false)
    }
  }

  // ── History modal ────────────────────────────────────────────────────────────
  async function openHistoryModal(user) {
    setModalError(null)
    setHistoryModal({ user, data: null, loading: true })
    try {
      const res = await getUserHistory(user.id)
      setHistoryModal({ user, data: res.data.data, loading: false })
    } catch (err) {
      setHistoryModal({
        user,
        data: null,
        loading: false,
        error: err.response?.data?.message || 'Erreur lors du chargement.',
      })
    }
  }

  // ── Suspend toggle ───────────────────────────────────────────────────────────
  async function handleToggleSuspend(user) {
    setActionError(null)
    try {
      const res = await updateUser(user.id, { is_active: !user.is_active })
      setUsers(prev => prev.map(u => (u.id === user.id ? res.data.data : u)))
    } catch (err) {
      setActionError(err.response?.data?.message || 'Erreur lors de la suspension.')
    }
  }

  // ── Delete modal ─────────────────────────────────────────────────────────────
  function openDeleteModal(user) {
    setModalError(null)
    setDeleteModal(user)
  }

  async function handleDelete() {
    setModalLoading(true)
    setModalError(null)
    try {
      await deleteUser(deleteModal.id)
      setUsers(prev => prev.filter(u => u.id !== deleteModal.id))
      setDeleteModal(null)
    } catch (err) {
      setModalError(err.response?.data?.message || 'Erreur lors de la suppression.')
    } finally {
      setModalLoading(false)
    }
  }

  function closeModal() {
    setLevelModal(null)
    setPointsModal(null)
    setHistoryModal(null)
    setDeleteModal(null)
    setModalError(null)
  }

  if (loading) {
    return (
      <main className="admin-users">
        <p className="admin-users__status" aria-live="polite">Chargement des utilisateurs…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="admin-users">
        <p className="admin-users__status admin-users__status--error" role="alert">{error}</p>
      </main>
    )
  }

  return (
    <main className="admin-users">
      <header className="admin-users__header">
        <h1>Gestion des utilisateurs</h1>
        <p className="admin-users__count">
          {users.length} utilisateur{users.length !== 1 ? 's' : ''}
        </p>
      </header>

      {pendingCount > 0 && (
        <Link to="/admin/pending" className="admin-users__pending-banner">
          <span className="admin-users__pending-dot" aria-hidden="true" />
          {pendingCount} compte{pendingCount !== 1 ? 's' : ''} en attente de validation &rarr;
        </Link>
      )}

      {actionError && (
        <p className="admin-users__action-error" role="alert" aria-live="polite">{actionError}</p>
      )}

      <div className="admin-users__table-wrapper">
        <table className="admin-users__table" aria-label="Liste des utilisateurs">
          <thead>
            <tr>
              <th scope="col">Pseudo</th>
              <th scope="col">Email</th>
              <th scope="col">Type</th>
              <th scope="col">
                <button
                  className="sort-btn"
                  onClick={() => handleSort('level')}
                  aria-label={`Trier par niveau${sortField === 'level' ? `, ordre ${sortDir === 'asc' ? 'croissant' : 'décroissant'}` : ''}`}
                >
                  Niveau <SortIcon field="level" sortField={sortField} sortDir={sortDir} />
                </button>
              </th>
              <th scope="col">
                <button
                  className="sort-btn"
                  onClick={() => handleSort('points')}
                  aria-label={`Trier par points${sortField === 'points' ? `, ordre ${sortDir === 'asc' ? 'croissant' : 'décroissant'}` : ''}`}
                >
                  Points <SortIcon field="points" sortField={sortField} sortDir={sortDir} />
                </button>
              </th>
              <th scope="col">
                <button
                  className="sort-btn"
                  onClick={() => handleSort('date_joined')}
                  aria-label={`Trier par date d'inscription${sortField === 'date_joined' ? `, ordre ${sortDir === 'asc' ? 'croissant' : 'décroissant'}` : ''}`}
                >
                  Inscrit le <SortIcon field="date_joined" sortField={sortField} sortDir={sortDir} />
                </button>
              </th>
              <th scope="col">Statut</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-users__empty">Aucun utilisateur.</td>
              </tr>
            ) : (
              pageUsers.map(user => (
                <tr key={user.id} className={!user.is_active ? 'row--suspended' : ''}>
                  <td data-label="Nom">
                    <div className="user-name-cell">
                      <span className="user-name-full">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.pseudo}
                      </span>
                      <span className="user-name-pseudo">@{user.pseudo}</span>
                    </div>
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Type">{TYPE_LABELS[user.type_membre] ?? user.type_membre}</td>
                  <td data-label="Niveau">{LEVEL_LABELS[user.level] ?? user.level}</td>
                  <td data-label="Points">{user.points.toFixed(2)}</td>
                  <td data-label="Inscrit le">
                    {new Date(user.date_joined).toLocaleDateString('fr-FR')}
                  </td>
                  <td data-label="Statut">
                    <span className={`status-badge ${user.is_active ? 'status-badge--active' : 'status-badge--suspended'}`}>
                      {user.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td data-label="Actions" className="actions-cell">
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={() => openLevelModal(user)}
                      aria-label={`Modifier le niveau de ${user.pseudo}`}
                    >
                      Niveau
                    </button>
                    <button
                      className="btn btn--sm btn--outline"
                      onClick={() => openPointsModal(user)}
                      aria-label={`Modifier les points de ${user.pseudo}`}
                    >
                      Points
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => openHistoryModal(user)}
                      aria-label={`Voir l'historique de ${user.pseudo}`}
                    >
                      Historique
                    </button>
                    <button
                      className={`btn btn--sm ${user.is_active ? 'btn--warning' : 'btn--success'}`}
                      onClick={() => handleToggleSuspend(user)}
                      aria-label={user.is_active ? `Suspendre ${user.pseudo}` : `Réactiver ${user.pseudo}`}
                    >
                      {user.is_active ? 'Suspendre' : 'Réactiver'}
                    </button>
                    <button
                      className="btn btn--sm btn--danger"
                      onClick={() => openDeleteModal(user)}
                      aria-label={`Supprimer définitivement ${user.pseudo}`}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Navigation par pages">
          <button
            className="btn btn--sm btn--outline"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            aria-label="Page précédente"
          >
            ←
          </button>
          <span className="pagination__info">Page {page} / {totalPages}</span>
          <button
            className="btn btn--sm btn--outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            aria-label="Page suivante"
          >
            →
          </button>
        </nav>
      )}

      {/* ── Modal : modifier le niveau ─────────────────────────────────────────── */}
      {levelModal && (
        <Modal id="level-modal-title" title={`Modifier le niveau — ${levelModal.pseudo}`} onClose={closeModal}>
          {modalError && <p className="modal__error" role="alert">{modalError}</p>}
          <div className="modal__field">
            <label htmlFor="level-select">Niveau</label>
            <select
              id="level-select"
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
            >
              {LEVELS.map(l => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={handleSetLevel} disabled={modalLoading}>
              {modalLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button className="btn btn--ghost" onClick={closeModal}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* ── Modal : modifier les points ───────────────────────────────────────── */}
      {pointsModal && (
        <Modal id="points-modal-title" title={`Modifier les points — ${pointsModal.pseudo}`} onClose={closeModal}>
          {modalError && <p className="modal__error" role="alert" id="points-error">{modalError}</p>}
          <div className="modal__field">
            <label htmlFor="points-input">Points</label>
            <input
              id="points-input"
              type="number"
              min="0"
              step="0.25"
              value={newPoints}
              onChange={e => setNewPoints(e.target.value)}
              aria-describedby={modalError ? 'points-error' : undefined}
            />
          </div>
          <div className="modal__actions">
            <button className="btn btn--primary" onClick={handleSetPoints} disabled={modalLoading}>
              {modalLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button className="btn btn--ghost" onClick={closeModal}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* ── Modal : historique ────────────────────────────────────────────────── */}
      {historyModal && (
        <Modal id="history-modal-title" title={`Historique — ${historyModal.user.pseudo}`} onClose={closeModal}>
          {historyModal.loading && <p aria-live="polite">Chargement…</p>}
          {historyModal.error && <p className="modal__error" role="alert">{historyModal.error}</p>}
          {historyModal.data && (
            <>
              <div className="history-stats" aria-live="polite">
                <div className="history-stat">
                  <span className="history-stat__value">{historyModal.data.login_count}</span>
                  <span className="history-stat__label">Connexions totales</span>
                </div>
                <div className="history-stat">
                  <span className="history-stat__value">{historyModal.data.action_count}</span>
                  <span className="history-stat__label">Actions effectuées</span>
                </div>
              </div>
              {historyModal.data.last_login && (
                <p className="history-last-login">
                  Dernière connexion :{' '}
                  <strong>{new Date(historyModal.data.last_login).toLocaleString('fr-FR')}</strong>
                </p>
              )}
              {historyModal.data.connexions.length > 0 ? (
                <section className="connexions-section">
                  <h3>50 dernières connexions</h3>
                  <ul className="connexions-list">
                    {historyModal.data.connexions.map((date, i) => (
                      <li key={i}>{new Date(date).toLocaleString('fr-FR')}</li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="connexions-empty">Aucune connexion enregistrée.</p>
              )}
            </>
          )}
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={closeModal}>Fermer</button>
          </div>
        </Modal>
      )}

      {/* ── Modal : confirmer la suppression ─────────────────────────────────── */}
      {deleteModal && (
        <Modal id="delete-modal-title" title="Supprimer l'utilisateur" onClose={closeModal}>
          <p>
            Êtes-vous sûr de vouloir supprimer définitivement{' '}
            <strong>{deleteModal.pseudo}</strong> ?
          </p>
          <p className="modal__warning">Cette action est irréversible.</p>
          {modalError && <p className="modal__error" role="alert">{modalError}</p>}
          <div className="modal__actions">
            <button className="btn btn--danger" onClick={handleDelete} disabled={modalLoading}>
              {modalLoading ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <button className="btn btn--ghost" onClick={closeModal}>Annuler</button>
          </div>
        </Modal>
      )}
    </main>
  )
}
