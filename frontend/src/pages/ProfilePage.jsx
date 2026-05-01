import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './ProfilePage.css'

// ── Constantes ────────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = { debutant: 0, intermediaire: 3, avance: 5, expert: 7 }
const LEVEL_NEXT       = { debutant: 'intermediaire', intermediaire: 'avance', avance: 'expert', expert: null }

const LEVEL_META = {
  debutant:      { label: 'Débutant',      color: 'var(--color-text-muted)',  access: 'Consultation de base' },
  intermediaire: { label: 'Intermédiaire', color: '#0ea5e9',                  access: 'Consultation étendue' },
  avance:        { label: 'Avancé',        color: '#f59e0b',                  access: 'Module Gestion' },
  expert:        { label: 'Expert',        color: '#ef4444',                  access: 'Module Administration' },
}

const TYPE_META = {
  resident: 'Résident',
  referent: 'Référent de quartier',
  syndic:   'Membre du syndic',
}

const GENRE_LABELS = { homme: 'Homme', femme: 'Femme', autre: 'Autre', nr: 'Non renseigné' }

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Barre de progression niveau ───────────────────────────────────────────────
function LevelProgress({ user }) {
  const meta  = LEVEL_META[user.level] ?? LEVEL_META.debutant
  const next  = LEVEL_NEXT[user.level]
  const nextMeta = next ? LEVEL_META[next] : null

  let pct = 100
  if (next) {
    const cur  = LEVEL_THRESHOLDS[user.level]
    const nxt  = LEVEL_THRESHOLDS[next]
    pct = Math.min(100, Math.max(0, ((user.points - cur) / (nxt - cur)) * 100))
  }

  return (
    <div className="pp-level-block">
      <div className="pp-level-header">
        <span className="pp-level-pill" style={{ '--lc': meta.color }}>
          {meta.label}
        </span>
        <span className="pp-points">{user.points.toFixed(1)} pts</span>
      </div>
      <div className="pp-level-access">
        Accès : <strong>{meta.access}</strong>
      </div>
      <div className="pp-progress-wrap">
        <div className="pp-progress-track">
          <div className="pp-progress-fill" style={{ width: `${pct}%`, '--lc': meta.color }} />
        </div>
        <span className="pp-progress-hint">
          {next
            ? `${user.points.toFixed(1)} / ${LEVEL_THRESHOLDS[next]} pts → ${nextMeta.label}`
            : 'Niveau maximum atteint'}
        </span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [isEditing, setIsEditing]   = useState(false)
  const [formData, setFormData]     = useState({})
  const [pwForm, setPwForm]         = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [showPwModal, setShowPwModal] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        pseudo:         user.pseudo        || '',
        first_name:     user.first_name    || '',
        last_name:      user.last_name     || '',
        genre:          user.genre         || 'nr',
        date_naissance: user.date_naissance || '',
      })
    }
  }, [user])

  function field(k, v) { setFormData(f => ({ ...f, [k]: v })) }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const payload = Object.fromEntries(Object.entries(formData).filter(([, v]) => v !== ''))
      const res = await api.patch('/auth/me/', payload)
      setUser(res.data.data)
      setIsEditing(false)
      setSuccess('Profil mis à jour.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour.')
    } finally { setLoading(false) }
  }

  async function handleChangePw(e) {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      await api.post('/auth/me/change-password/', { old_password: pwForm.old_password, new_password: pwForm.new_password })
      setSuccess('Mot de passe modifié.')
      setShowPwModal(false)
      setPwForm({ old_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.')
    } finally { setLoading(false) }
  }

  if (!user) return <div className="pp-page"><p>Chargement…</p></div>

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.pseudo

  return (
    <div className="pp-page page-content">

      {/* ── En-tête ── */}
      <div className="pp-header">
        <div className="pp-identity">
          <h1 className="pp-name">{fullName}</h1>
          <span className="pp-pseudo">@{user.pseudo}</span>
        </div>
        {!isEditing && (
          <button className="pp-btn pp-btn--outline" onClick={() => setIsEditing(true)}>
            Modifier le profil
          </button>
        )}
      </div>

      {error   && <p className="pp-banner pp-banner--err"  role="alert">{error}</p>}
      {success && <p className="pp-banner pp-banner--ok">{success}</p>}

      <div className="pp-grid">

        {/* ── Colonne gauche : identité ── */}
        <div className="pp-col">

          {/* Qui vous êtes */}
          <section className="pp-card">
            <h2 className="pp-card-title">Rôle dans la résidence</h2>
            <p className="pp-card-hint">Qui vous êtes — indépendant de votre niveau d'accès.</p>
            <div className="pp-row-list">
              <div className="pp-row">
                <span className="pp-row-label">Type</span>
                <span className="pp-row-value pp-type-badge">{TYPE_META[user.type_membre] ?? user.type_membre}</span>
              </div>
              <div className="pp-row">
                <span className="pp-row-label">Genre</span>
                <span className="pp-row-value">{GENRE_LABELS[user.genre] ?? '—'}</span>
              </div>
              {user.date_naissance && (
                <div className="pp-row">
                  <span className="pp-row-label">Date de naissance</span>
                  <span className="pp-row-value">{fmtDate(user.date_naissance)}</span>
                </div>
              )}
              <div className="pp-row">
                <span className="pp-row-label">Membre depuis</span>
                <span className="pp-row-value">{fmtDate(user.date_joined)}</span>
              </div>
            </div>
          </section>

          {/* Sécurité */}
          <section className="pp-card">
            <h2 className="pp-card-title">Sécurité</h2>
            <div className="pp-row-list">
              <div className="pp-row">
                <span className="pp-row-label">Adresse e-mail</span>
                <span className="pp-row-value">{user.email}</span>
              </div>
            </div>
            <button className="pp-btn pp-btn--ghost pp-mt" onClick={() => setShowPwModal(true)}>
              Changer le mot de passe
            </button>
          </section>

        </div>

        {/* ── Colonne droite : accès plateforme ── */}
        <div className="pp-col">

          {/* Niveau d'accès */}
          <section className="pp-card pp-card--accent">
            <h2 className="pp-card-title">Niveau d'accès plateforme</h2>
            <p className="pp-card-hint">Ce que vous pouvez faire — progresse automatiquement avec vos points.</p>
            <LevelProgress user={user} />
            <div className="pp-stats">
              <div className="pp-stat">
                <span className="pp-stat-val">{user.login_count}</span>
                <span className="pp-stat-lbl">Connexions</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-val">{user.action_count}</span>
                <span className="pp-stat-lbl">Actions</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-val">{user.points.toFixed(1)}</span>
                <span className="pp-stat-lbl">Points</span>
              </div>
            </div>

            {/* Tableau des niveaux */}
            <div className="pp-levels-table">
              {Object.entries(LEVEL_META).map(([key, meta]) => (
                <div key={key} className={`pp-level-row${user.level === key ? ' pp-level-row--current' : ''}`}>
                  <span className="pp-level-dot" style={{ background: meta.color }} />
                  <span className="pp-level-name">{meta.label}</span>
                  <span className="pp-level-pts">{LEVEL_THRESHOLDS[key]} pts</span>
                  <span className="pp-level-desc">{meta.access}</span>
                  {user.level === key && <span className="pp-level-you">← vous</span>}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* ── Formulaire d'édition ── */}
      {isEditing && (
        <section className="pp-card pp-edit-card">
          <h2 className="pp-card-title">Modifier le profil</h2>
          <form onSubmit={handleSaveProfile} noValidate>
            <div className="pp-form-grid">
              <div className="pp-field">
                <label className="pp-label">Prénom</label>
                <input className="pp-input" value={formData.first_name} onChange={e => field('first_name', e.target.value)} />
              </div>
              <div className="pp-field">
                <label className="pp-label">Nom</label>
                <input className="pp-input" value={formData.last_name} onChange={e => field('last_name', e.target.value)} />
              </div>
              <div className="pp-field">
                <label className="pp-label">Pseudo <span aria-hidden="true">*</span></label>
                <input className="pp-input" value={formData.pseudo} onChange={e => field('pseudo', e.target.value)} required />
              </div>
              <div className="pp-field">
                <label className="pp-label">Genre</label>
                <select className="pp-input" value={formData.genre} onChange={e => field('genre', e.target.value)}>
                  <option value="nr">Non renseigné</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="pp-field pp-field--full">
                <label className="pp-label">Date de naissance</label>
                <input className="pp-input" type="date" value={formData.date_naissance} onChange={e => field('date_naissance', e.target.value)} />
              </div>
            </div>
            <div className="pp-form-actions">
              <button type="submit" className="pp-btn pp-btn--primary" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" className="pp-btn pp-btn--ghost" onClick={() => setIsEditing(false)} disabled={loading}>
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Modal mot de passe ── */}
      {showPwModal && (
        <div className="pp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !loading) setShowPwModal(false) }}>
          <div className="pp-modal" role="dialog" aria-modal="true">
            <div className="pp-modal-header">
              <h2 className="pp-modal-title">Changer le mot de passe</h2>
              <button className="pp-modal-close" onClick={() => setShowPwModal(false)} aria-label="Fermer">✕</button>
            </div>
            <form onSubmit={handleChangePw} noValidate>
              {error && <p className="pp-banner pp-banner--err">{error}</p>}
              <div className="pp-field">
                <label className="pp-label">Mot de passe actuel</label>
                <input className="pp-input" type="password" value={pwForm.old_password} onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} required autoComplete="current-password" />
              </div>
              <div className="pp-field pp-mt">
                <label className="pp-label">Nouveau mot de passe</label>
                <input className="pp-input" type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="pp-field pp-mt">
                <label className="pp-label">Confirmer le mot de passe</label>
                <input className="pp-input" type="password" value={pwForm.confirm_password} onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="pp-form-actions pp-mt">
                <button type="submit" className="pp-btn pp-btn--primary" disabled={loading}>
                  {loading ? 'Modification…' : 'Modifier'}
                </button>
                <button type="button" className="pp-btn pp-btn--ghost" onClick={() => setShowPwModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
