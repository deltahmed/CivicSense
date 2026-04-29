import { useState, useEffect, useRef } from 'react'
import { getSettings, updateSettings } from '../api/admin'
import './AdminSettingsPage.css'

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    nom_residence: 'CivicSense',
    couleur_theme: '#378ADD',
    approbation_manuelle: true,
    domaines_email_autorises: [],
    message_inscription: '',
  })
  const [bannerUrl, setBannerUrl] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await getSettings()
        const d = res.data
        setForm({
          nom_residence: d.nom_residence ?? 'CivicSense',
          couleur_theme: d.couleur_theme ?? '#378ADD',
          approbation_manuelle: d.approbation_manuelle ?? true,
          domaines_email_autorises: d.domaines_email_autorises ?? [],
          message_inscription: d.message_inscription ?? '',
        })
        setBannerUrl(d.banniere || null)
      } catch {
        setError('Impossible de charger les paramètres.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setSuccess(null)
  }

  function handleBannerChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setSuccess(null)
  }

  function handleRemoveBanner() {
    setBannerFile(null)
    setBannerPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleTagKeyDown(e) {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !form.domaines_email_autorises.includes(tag)) {
        handleField('domaines_email_autorises', [...form.domaines_email_autorises, tag])
      }
      setTagInput('')
    }
  }

  function removeTag(tag) {
    handleField('domaines_email_autorises', form.domaines_email_autorises.filter(t => t !== tag))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      let payload, config = {}
      if (bannerFile) {
        payload = new FormData()
        payload.append('nom_residence', form.nom_residence)
        payload.append('couleur_theme', form.couleur_theme)
        payload.append('approbation_manuelle', form.approbation_manuelle ? 'true' : 'false')
        payload.append('domaines_email_autorises', JSON.stringify(form.domaines_email_autorises))
        payload.append('message_inscription', form.message_inscription)
        payload.append('banniere', bannerFile)
        config = { headers: { 'Content-Type': 'multipart/form-data' } }
      } else {
        payload = { ...form }
      }
      const res = await updateSettings(payload, config)
      setBannerUrl(res.data.banniere || null)
      setBannerFile(null)
      setBannerPreview(null)
      setSuccess('Paramètres enregistrés avec succès.')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const previewBanner = bannerPreview || bannerUrl

  if (loading) return <main className="admin-settings"><p className="as-status">Chargement…</p></main>

  return (
    <main className="admin-settings">
      <header className="admin-settings__header">
        <h1>Paramètres de la résidence</h1>
      </header>

      <div className="as-layout">
        <form className="as-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="as-alert as-alert--error" role="alert">{error}</p>}
          {success && <p className="as-alert as-alert--success" role="status">{success}</p>}

          {/* Apparence */}
          <section className="as-card" aria-labelledby="apparence-title">
            <h2 id="apparence-title">Apparence</h2>

            <div className="as-field">
              <label htmlFor="nom-residence">Nom de la résidence</label>
              <input
                id="nom-residence"
                type="text"
                value={form.nom_residence}
                onChange={e => handleField('nom_residence', e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="as-field">
              <label htmlFor="couleur-theme">Couleur principale</label>
              <div className="as-color-row">
                <input
                  id="couleur-theme"
                  type="color"
                  value={form.couleur_theme}
                  onChange={e => handleField('couleur_theme', e.target.value)}
                  className="as-color-swatch"
                />
                <input
                  type="text"
                  value={form.couleur_theme}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleField('couleur_theme', v)
                  }}
                  maxLength={7}
                  className="as-color-hex"
                  placeholder="#378ADD"
                />
              </div>
            </div>

            <div className="as-field">
              <label>Bannière</label>
              {previewBanner && (
                <div className="as-banner-preview">
                  <img src={previewBanner} alt="Bannière" />
                  {bannerFile && (
                    <button type="button" className="as-btn as-btn--outline as-btn--sm" onClick={handleRemoveBanner}>
                      Annuler le changement
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="as-file-input"
              />
            </div>
          </section>

          {/* Inscription */}
          <section className="as-card" aria-labelledby="inscription-title">
            <h2 id="inscription-title">Règles d'inscription</h2>

            <div className="as-field">
              <div className="as-toggle-row">
                <span>Approbation manuelle des comptes</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.approbation_manuelle}
                  className={`as-toggle ${form.approbation_manuelle ? 'as-toggle--on' : ''}`}
                  onClick={() => handleField('approbation_manuelle', !form.approbation_manuelle)}
                >
                  <span className="as-toggle__thumb" />
                </button>
              </div>
              <p className="as-hint">
                Si activé, chaque nouvel utilisateur doit être approuvé manuellement avant de pouvoir se connecter.
              </p>
            </div>

            <div className="as-field">
              <label>Domaines email autorisés</label>
              <div className="as-tags-input">
                {form.domaines_email_autorises.map(tag => (
                  <span key={tag} className="as-tag">
                    {tag}
                    <button
                      type="button"
                      className="as-tag__remove"
                      onClick={() => removeTag(tag)}
                      aria-label={`Supprimer ${tag}`}
                    >×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={form.domaines_email_autorises.length === 0 ? 'Tous les domaines autorisés' : 'Ajouter…'}
                  className="as-tags-input__field"
                />
              </div>
              <p className="as-hint">Appuyez sur Entrée ou virgule pour ajouter (ex : @cy-tech.fr). Laisser vide pour tout autoriser.</p>
            </div>

            <div className="as-field">
              <label htmlFor="message-inscription">Message sur la page d'inscription</label>
              <textarea
                id="message-inscription"
                value={form.message_inscription}
                onChange={e => handleField('message_inscription', e.target.value)}
                rows={4}
                placeholder="Bienvenue dans notre résidence…"
              />
            </div>
          </section>

          <div className="as-actions">
            <button type="submit" className="as-btn as-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>

        {/* Aperçu en temps réel */}
        <aside className="as-preview" aria-label="Aperçu en temps réel">
          <p className="as-preview__label">Aperçu en temps réel</p>
          <div className="as-preview-card">
            <div className="as-preview-card__header" style={{ backgroundColor: form.couleur_theme }}>
              {previewBanner && (
                <img src={previewBanner} alt="" className="as-preview-card__banner" />
              )}
              <span className="as-preview-card__name">
                {form.nom_residence || 'Nom de la résidence'}
              </span>
            </div>
            <div className="as-preview-card__body">
              {form.message_inscription
                ? <p className="as-preview-card__message">{form.message_inscription}</p>
                : <p className="as-preview-card__placeholder">Message d'inscription…</p>
              }
              <span
                className="as-preview-card__badge"
                style={{ borderColor: form.couleur_theme, color: form.couleur_theme }}
              >
                Rejoindre la résidence
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
