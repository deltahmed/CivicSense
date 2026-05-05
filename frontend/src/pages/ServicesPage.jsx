import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { canAccessLevel } from '../utils/access'
import { createAdminService, updateAdminService, deleteAdminService } from '../api/admin'
import '../styles/ServicesPage.css'

// Catégories larges partagées avec la page publique et le formulaire
export const SERVICE_CATEGORIES = [
  { key: 'Sécurité & Accès',       label: 'Sécurité & Accès'       },
  { key: 'Énergie & Environnement', label: 'Énergie & Environnement' },
  { key: 'Eau & Sanitaire',         label: 'Eau & Sanitaire'         },
  { key: 'Collecte & Déchets',      label: 'Collecte & Déchets'      },
  { key: 'Numérique & Domotique',   label: 'Numérique & Domotique'   },
  { key: 'Espaces & Vie commune',   label: 'Espaces & Vie commune'   },
  { key: 'Autre',                   label: 'Autre'                   },
]

const RESIDENCE_SERVICES = [
  {
    id: 'acces',
    nom: "Gestion d'accès",
    description: 'Contrôle des serrures, digicodes et accès à la résidence',
    icon: '🚪',
    couleur: '#3b82f6',
    objectTypes: ['serrure', 'digicode', 'capteur_porte'],
  },
  {
    id: 'energie',
    nom: "Consommation d'énergie",
    description: 'Suivi et optimisation de la consommation électrique',
    icon: '⚡',
    couleur: '#f59e0b',
    objectTypes: ['compteur', 'prise', 'eclairage', 'thermostat'],
  },
  {
    id: 'eau',
    nom: "Consommation d'eau",
    description: 'Monitoring de la consommation en eau et détection de fuites',
    icon: '💧',
    couleur: '#06b6d4',
    objectTypes: ['compteur_eau', 'capteur_fuite'],
  },
  {
    id: 'dechets',
    nom: 'Gestion des déchets',
    description: 'Calendrier des collectes et suivi du taux de remplissage',
    icon: '♻️',
    couleur: '#22c55e',
    objectTypes: ['capteur_remplissage'],
  },
]

const OTHER_RESIDENCE_SERVICES = [
  { id: 'nettoyage', nom: 'Nettoyage et maintenance', icon: '🧹', description: 'Espaces communs et entretien', type: 'other', groupe: 'Vie pratique' },
  { id: 'parking', nom: 'Stationnement et mobilité', icon: '🚗', description: 'Gestion parking et vélos', type: 'other', groupe: 'Vie pratique' },
  { id: 'espaces-verts', nom: 'Espaces verts et jardinage', icon: '🌱', description: 'Jardins et espaces paysagers', type: 'other', groupe: 'Confort & loisirs' },
  { id: 'securite', nom: 'Sécurité et surveillance', icon: '📹', description: 'Vidéosurveillance et patrouille', type: 'other', groupe: 'Vie pratique' },
  { id: 'accueil', nom: 'Accueil et conciergerie', icon: '🏢', description: 'Service d\'accueil et assistance', type: 'other', groupe: 'Vie pratique' },
  { id: 'bibliotheque', nom: 'Bibliothèque et ressources', icon: '📚', description: 'Livres et documentation', type: 'other', groupe: 'Confort & loisirs' },
  { id: 'sante', nom: 'Santé et bien-être', icon: '💪', description: 'Services de santé et loisirs', type: 'other', groupe: 'Confort & loisirs' },
  { id: 'evenements', nom: 'Événements et animations', icon: '🎉', description: 'Activités résidentielles', type: 'other', groupe: 'Confort & loisirs' },
]

export { OTHER_RESIDENCE_SERVICES }

const PUBLIC_CONCERNE_LABELS = {
  tout_le_monde: 'Tout le monde',
  residents: 'Résidents',
  visiteurs: 'Visiteurs',
  syndic: 'Syndic / gestion',
}

const PUBLIC_CONCERNE_OPTIONS = [
  { key: 'tout_le_monde', label: 'Tout le monde' },
  { key: 'residents', label: 'Résidents' },
  { key: 'syndic', label: 'Syndic / gestion' },
]

const EMPTY_FORM = { nom: '', description: '', categorie: '', public_concerne: 'tout_le_monde', visible: true }

export default function ServicesPage() {
  const { user }  = useAuth()
  const isExpert = user?.level === 'expert'
  const [objects, setObjects]       = useState([])
  const [dbServices, setDbServices] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)   // null | { mode: 'create' } | { mode: 'edit', service }
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formError, setFormError]   = useState('')
  const [busy, setBusy]             = useState(false)
  const [success, setSuccess]       = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/objects/').then(r => setObjects(r.data?.data ?? [])),
      api.get('/services/').then(r => setDbServices(r.data?.data ?? [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    document.title = 'Services — CivicSense'
    loadData()
  }, [])

  const getStats = (service) => {
    const objs = objects.filter(o => service.objectTypes.some(t => o.type_objet === t))
    return {
      total:  objs.length,
      actifs: objs.filter(o => o.statut === 'actif').length,
    }
  }

  function openModal() {
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

  function openDeleteModal(service) {
    setDeleteModal(service)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nom.trim()) { setFormError('Le nom est obligatoire.'); return }
    setBusy(true)
    setFormError('')
    try {
      if (modal.mode === 'create') {
        await createAdminService(form)
        setSuccess('Service ajouté avec succès.')
      } else {
        await updateAdminService(modal.service.id, form)
        setSuccess('Service mis à jour.')
      }
      setModal(null)
      loadData()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const data = err.response?.data
      setFormError(data?.nom?.[0] ?? data?.detail ?? 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal) return
    const serviceToDelete = deleteModal
    setDeleteModal(null)
    setBusy(true)
    try {
      await deleteAdminService(serviceToDelete.id)
      setSuccess('Service supprimé avec succès.')
      loadData()
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      loadData()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="services-page page-content">

      {/* ── Header ── */}
      <div className="services-heading">
        <div className="services-heading-row">
          <div>
            <h1>Services</h1>
            <p className="services-subtitle">Les services connectés de votre résidence</p>
          </div>
            {isExpert && (
            <button className="services-admin-btn" onClick={openModal}>
              + Ajouter un service
            </button>
          )}
        </div>
      </div>

      {success && <p className="services-banner-ok">{success}</p>}

      {loading ? (
        <p className="services-loading">Chargement...</p>
      ) : (
        <>
          {/* ── 4 services résidence ── */}
          <div className="residence-services-grid">
            {RESIDENCE_SERVICES.map(service => {
              const stats = getStats(service)
              return (
                <Link
                  key={service.id}
                  to={`/services/${service.id}`}
                  className="residence-service-card"
                  style={{ '--service-color': service.couleur }}
                >
                  <div className="rsc-icon" aria-hidden="true">{service.icon}</div>
                  <div className="rsc-content">
                    <h2 className="rsc-nom">{service.nom}</h2>
                    <p className="rsc-desc">{service.description}</p>
                    <div className="rsc-stats">
                      <span>{stats.total} objet{stats.total !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{stats.actifs} actif{stats.actifs !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="rsc-arrow" aria-hidden="true">→</span>
                </Link>
              )
            })}
          </div>

          {/* ── Autres services résidence (issues de la base) ── */}
          <section className="other-services-section">
            <h2 className="other-services-title">Autres services de la résidence</h2>
            <div className="other-services-grid">
              {dbServices.map((service) => (
                <div
                  key={service.id}
                  className="other-service-card"
                >
                  <div className="osc-content">
                    <h3 className="osc-nom">{service.nom}</h3>
                    <p className="osc-desc">{service.description}</p>
                      {isExpert && (
                      <div className="osc-actions">
                        <button
                          type="button"
                          className="osc-btn osc-btn--edit"
                          onClick={() => openEdit(service)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="osc-btn osc-btn--delete"
                          onClick={() => openDeleteModal(service)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </>
      )}

      {/* ── Modal création / édition ── */}
      {modal && (
        <div
          className="services-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="svc-modal-title"
          onClick={e => { if (e.target === e.currentTarget && !busy) setModal(null) }}
        >
          <div className="services-modal">
            <h2 className="services-modal-title" id="svc-modal-title">
              {modal.mode === 'create' ? 'Nouveau service' : 'Modifier le service'}
            </h2>

            {formError && <p className="services-modal-error" role="alert">{formError}</p>}

            <form onSubmit={handleSubmit} className="services-form">
              <label className="services-label">
                Nom *
                <input
                  className="services-input"
                  name="nom"
                  value={form.nom}
                  onChange={handleField}
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>

              <label className="services-label">
                Catégorie
                <select
                  className="services-select"
                  name="categorie"
                  value={form.categorie}
                  onChange={handleField}
                  required
                >
                  <option value="" disabled>Choisir une catégorie</option>
                  {SERVICE_CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="services-label">
                Public concerné
                <select
                  className="services-select"
                  name="public_concerne"
                  value={form.public_concerne}
                  onChange={handleField}
                  required
                >
                  <option value="" disabled>Choisir un public</option>
                  {PUBLIC_CONCERNE_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </label>

              <label className="services-label">
                Description
                <textarea
                  className="services-textarea"
                  name="description"
                  value={form.description}
                  onChange={handleField}
                  rows={3}
                  placeholder="Description optionnelle…"
                />
              </label>

              <div className="services-modal-actions">
                <button type="submit" className="services-admin-btn" disabled={busy}>
                  {busy ? 'Enregistrement…' : (modal.mode === 'create' ? 'Créer' : 'Enregistrer')}
                </button>
                <button
                  type="button"
                  className="services-btn-ghost"
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

      {deleteModal && (
        <div
          className="services-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-service-title"
          onClick={e => { if (e.target === e.currentTarget && !busy) setDeleteModal(null) }}
        >
          <div className="services-modal">
            <h2 className="services-modal-title" id="delete-service-title">Supprimer le service</h2>
            <p className="services-modal-body">
              Supprimer définitivement <strong>« {deleteModal.nom} »</strong> ?
            </p>
            {formError && <p className="services-modal-error" role="alert">{formError}</p>}
            <div className="services-modal-actions">
              <button type="button" className="services-admin-btn" onClick={handleDelete} disabled={busy}>
                {busy ? 'Suppression…' : 'Supprimer'}
              </button>
              <button type="button" className="services-btn-ghost" onClick={() => setDeleteModal(null)} disabled={busy}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
