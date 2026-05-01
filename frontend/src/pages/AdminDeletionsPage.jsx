import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import './AdminDeletionsPage.css'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminDeletionsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [busy, setBusy]         = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/deletion-requests/')
      setRequests(res.data.data ?? [])
    } catch {
      setError('Impossible de charger les demandes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Demandes de suppression — CivicSense'
    load()
  }, [load])

  async function handleAction(id, action) {
    setBusy(id)
    setError('')
    setSuccess('')
    try {
      const res = await api.patch(`/deletion-requests/${id}/`, { action })
      setSuccess(res.data.message)
      setRequests(prev => prev.filter(r => r.id !== id))
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du traitement.')
    } finally {
      setBusy(null)
      setConfirmModal(null)
    }
  }

  return (
    <main className="adp-page page-content">
      <div className="adp-header">
        <div>
          <h1 className="adp-title">Demandes de suppression</h1>
          <p className="adp-subtitle">Demandes soumises par les utilisateurs Complexe (avancé)</p>
        </div>
        <button className="adp-btn adp-btn--outline" onClick={load} disabled={loading}>
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      {error   && <p className="adp-banner adp-banner--err"  role="alert">{error}</p>}
      {success && <p className="adp-banner adp-banner--ok">{success}</p>}

      {loading && <p className="adp-state">Chargement…</p>}

      {!loading && requests.length === 0 && (
        <div className="adp-empty">
          <span className="adp-empty-icon" aria-hidden="true">✅</span>
          <p>Aucune demande en attente.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="adp-list">
          {requests.map(r => (
            <div key={r.id} className="adp-card">
              <div className="adp-card-top">
                <div className="adp-card-info">
                  <span className="adp-obj-name">{r.objet_nom}</span>
                  <span className="adp-meta">
                    Demandé par <strong>{r.demandeur_pseudo}</strong> · {fmtDate(r.created_at)}
                  </span>
                </div>
                <span className="adp-status">En attente</span>
              </div>
              <p className="adp-motif">
                <span className="adp-motif-label">Motif :</span> {r.motif}
              </p>
              <div className="adp-actions">
                <button
                  className="adp-btn adp-btn--danger"
                  onClick={() => setConfirmModal({ id: r.id, nom: r.objet_nom })}
                  disabled={busy === r.id}
                >
                  Approuver et supprimer
                </button>
                <button
                  className="adp-btn adp-btn--ghost"
                  onClick={() => handleAction(r.id, 'refuser')}
                  disabled={busy === r.id}
                >
                  {busy === r.id ? 'Traitement…' : 'Refuser'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de confirmation suppression ── */}
      {confirmModal && (
        <div
          className="adp-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget) setConfirmModal(null) }}
        >
          <div className="adp-modal">
            <h2 className="adp-modal-title">Confirmer la suppression</h2>
            <p className="adp-modal-body">
              Supprimer définitivement l'objet <strong>« {confirmModal.nom} »</strong> ?
              Cette action est <strong>irréversible</strong>.
            </p>
            <div className="adp-modal-actions">
              <button
                className="adp-btn adp-btn--danger"
                onClick={() => handleAction(confirmModal.id, 'approuver')}
                disabled={busy === confirmModal.id}
              >
                {busy === confirmModal.id ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
              <button
                className="adp-btn adp-btn--ghost"
                onClick={() => setConfirmModal(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
