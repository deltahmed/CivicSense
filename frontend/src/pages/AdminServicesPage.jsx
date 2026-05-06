import { useState, useEffect, useCallback, useMemo } from 'react'
import { getAdminServices, createAdminService, updateAdminService, deleteAdminService } from '../api/admin'
import { SERVICE_CATEGORIES } from './ServicesPage'
import './AdminServicesPage.css'

const PUBLIC_CONCERNE_LABELS = {
  tout_le_monde: 'Tout le monde',
  residents: 'Résidents',
  visiteurs: 'Visiteurs',
  syndic: 'Syndic',
}

const PUBLIC_CONCERNE_OPTIONS = [
  { key: 'tout_le_monde', label: 'Tout le monde' },
  { key: 'residents', label: 'Résidents' },
  { key: 'syndic', label: 'Syndic' },
]

const EMPTY_FORM = { nom: '', description: '', categorie: SERVICE_CATEGORIES[0].key, public_concerne: 'tout_le_monde', visible: true }

export default function AdminServicesPage() {
  const [services, setServices]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [busy, setBusy]             = useState(false)

  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAudience, setFilterAudience] = useState('all')

  const [modal, setModal]           = useState(null)   // null | { mode:'create' } | { mode:'edit', service }
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formError, setFormError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAdminServices()
      setServices(Array.isArray(res.data) ? res.data : (res.data.results ?? []))
    } catch {
      setError('Impossible de charger les services.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Services — Administration — SmartResi'
    load()
  }, [load])

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal({ mode: 'create' })
  }

  function openEdit(service) {
    setForm({
      nom: service.nom,
      description: service.description ?? '',
      categorie: service.categorie,
      public_concerne: service.public_concerne ?? 'tout_le_monde',
      visible: service.visible ?? true,
    })
    setFormError('')
    setModal({ mode: 'edit', service })
  }

  function handleField(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      if (filterCategory !== 'all' && service.categorie !== filterCategory) return false
      if (filterAudience !== 'all' && service.public_concerne !== filterAudience) return false
      return true
    })
  }, [services, filterCategory, filterAudience])

  const categoryCounts = useMemo(() => {
    return SERVICE_CATEGORIES.reduce((acc, category) => {
      acc[category.key] = services.filter(service => service.categorie === category.key).length
      return acc
    }, {})
  }, [services])

  const audienceOptions = useMemo(() => {
    return [
      { key: 'all', label: 'Tout le monde', count: services.length },
      ...Object.entries(PUBLIC_CONCERNE_LABELS).map(([key, label]) => ({
        key,
        label,
        count: services.filter(service => service.public_concerne === key).length,
      })).filter(option => option.key === 'all' || option.count > 0),
    ]
  }, [services])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) {
      setFormError('Le nom est obligatoire.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      if (modal.mode === 'create') {
        await createAdminService(form)
        setSuccess('Service créé avec succès.')
      } else {
        await updateAdminService(modal.service.id, form)
        setSuccess('Service mis à jour.')
      }
      setModal(null)
      load()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const data = err.response?.data
      setFormError(
        data?.nom?.[0] ?? data?.categorie?.[0] ?? data?.detail ?? 'Une erreur est survenue.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(service) {
    setBusy(true)
    setError('')
    try {
      await deleteAdminService(service.id)
      setServices(prev => prev.filter(item => item.id !== service.id))
      setSuccess(`Service « ${service.nom} » supprimé.`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const status = err.response?.status
      setError(
        status === 401 ? 'Session expirée, veuillez vous reconnecter.' :
        status === 403 ? 'Permission refusée.' :
        status === 404 ? `Service introuvable (id ${service.id}).` :
        `Erreur ${status ?? 'réseau'} — impossible de supprimer ce service.`
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="asv-page page-content">
      {/* ── Header ── */}
      <div className="asv-header">
        <div>
          <h1 className="asv-title">Catalogue des services</h1>
          <p className="asv-subtitle">Ajouter, modifier ou supprimer les services proposés sur la plateforme</p>
        </div>
        <button className="asv-btn asv-btn--primary" onClick={openCreate}>
          + Nouveau service
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="asv-filters" role="group" aria-label="Filtres des services">
        <div className="asv-filter-group">
          <span className="asv-filter-label">Catégorie</span>
          <div className="asv-chip-row">
            <button
              type="button"
              className={`asv-chip${filterCategory === 'all' ? ' asv-chip--active' : ''}`}
              onClick={() => setFilterCategory('all')}
              aria-pressed={filterCategory === 'all'}
            >
              Toutes
              <span className="asv-chip-count">{services.length}</span>
            </button>
            {SERVICE_CATEGORIES.map(category => {
              const count = categoryCounts[category.key] ?? 0
              if (count === 0) return null
              return (
                <button
                  key={category.key}
                  type="button"
                  className={`asv-chip${filterCategory === category.key ? ' asv-chip--active' : ''}`}
                  onClick={() => setFilterCategory(category.key)}
                  aria-pressed={filterCategory === category.key}
                >
                  {category.label}
                  <span className="asv-chip-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="asv-filter-group">
          <span className="asv-filter-label">Public concerné</span>
          <div className="asv-chip-row">
            {audienceOptions.map(option => (
              <button
                key={option.key}
                type="button"
                className={`asv-chip${filterAudience === option.key ? ' asv-chip--active' : ''}`}
                onClick={() => setFilterAudience(option.key)}
                aria-pressed={filterAudience === option.key}
              >
                {option.label}
                <span className="asv-chip-count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {error   && <p className="asv-banner asv-banner--err" role="alert">{error}</p>}
      {success && <p className="asv-banner asv-banner--ok">{success}</p>}

      {/* ── Content ── */}
      {loading && <p className="asv-state">Chargement…</p>}

      {!loading && filteredServices.length === 0 && (
        <div className="asv-empty">
          <span className="asv-empty-icon" aria-hidden="true">📭</span>
          <p>Aucun service trouvé.</p>
          <button className="asv-btn asv-btn--outline" onClick={openCreate}>
            Créer le premier service
          </button>
        </div>
      )}

      {!loading && filteredServices.length > 0 && (
        <div className="asv-table-wrap">
          <table className="asv-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Public concerné</th>
                <th>Description</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(s => (
                <tr key={s.id}>
                  <td className="asv-td-nom">{s.nom}</td>
                  <td><span className="asv-tag">{s.categorie}</span></td>
                  <td>
                    <span className={`asv-audience asv-audience--${s.public_concerne}`}>
                      {PUBLIC_CONCERNE_LABELS[s.public_concerne] ?? s.public_concerne}
                    </span>
                  </td>
                  <td className="asv-td-desc">{s.description || <span className="asv-muted">—</span>}</td>
                  <td className="asv-td-actions">
                    <button className="asv-btn asv-btn--sm asv-btn--outline" onClick={() => openEdit(s)}>
                      Modifier
                    </button>
                    <button className="asv-btn asv-btn--sm asv-btn--danger-ghost" onClick={() => handleDelete(s)} disabled={busy}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal création / édition ── */}
      {modal && (
        <div
          className="asv-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asv-modal-title"
          onClick={e => { if (e.target === e.currentTarget && !busy) setModal(null) }}
        >
          <div className="asv-modal">
            <h2 className="asv-modal-title" id="asv-modal-title">
              {modal.mode === 'create' ? 'Nouveau service' : 'Modifier le service'}
            </h2>

            {formError && <p className="asv-banner asv-banner--err" role="alert">{formError}</p>}

            <form onSubmit={handleSubmit} className="asv-form">
              <label className="asv-label">
                Nom <span aria-hidden="true">*</span>
                <input
                  className="asv-input"
                  name="nom"
                  value={form.nom}
                  onChange={handleField}
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>

              <label className="asv-label">
                Catégorie
                <select
                  className="asv-select"
                  name="categorie"
                  value={form.categorie}
                  onChange={handleField}
                >
                  {SERVICE_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="asv-label">
                Public concerné
                <select
                  className="asv-select"
                  name="public_concerne"
                  value={form.public_concerne}
                  onChange={handleField}
                >
                  {PUBLIC_CONCERNE_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="asv-label">
                Description
                <textarea
                  className="asv-textarea"
                  name="description"
                  value={form.description}
                  onChange={handleField}
                  rows={3}
                  placeholder="Description optionnelle du service…"
                />
              </label>

              <div className="asv-modal-actions">
                <button type="submit" className="asv-btn asv-btn--primary" disabled={busy}>
                  {busy ? 'Enregistrement…' : (modal.mode === 'create' ? 'Créer' : 'Enregistrer')}
                </button>
                <button
                  type="button"
                  className="asv-btn asv-btn--ghost"
                  onClick={() => setModal(null)}
                  disabled={busy}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
