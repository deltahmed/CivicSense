import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './LoginPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TYPE_MEMBRE_LABELS = {
  resident:     'Résident',
  referent:     'Référent',
  syndic:       'Syndic',
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    pseudo: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    genre: '',
    type_membre: 'resident',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mouse, setMouse] = useState({ x: 50, y: 16, rx: 0, ry: 0 })

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const rx = ((x - 50) / 50) * 1.1
    const ry = ((y - 50) / 50) * -1.1
    setMouse({ x, y, rx, ry })
  }

  function handleMouseLeave() {
    setMouse({ x: 50, y: 16, rx: 0, ry: 0 })
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
  }

  function validateForm() {
    const errors = {}
    if (!form.email.trim()) errors.email = ['Ce champ est requis.']
    else if (!EMAIL_REGEX.test(form.email)) errors.email = ['Adresse e-mail invalide.']
    if (!form.password) errors.password = ['Ce champ est requis.']
    else if (form.password.length < 8) errors.password = ['Le mot de passe doit contenir au moins 8 caractères.']
    if (!form.confirmPassword) errors.confirmPassword = ['Ce champ est requis.']
    else if (form.password !== form.confirmPassword) errors.confirmPassword = ['Les mots de passe ne correspondent pas.']
    if (!form.pseudo.trim()) errors.pseudo = ['Ce champ est requis.']
    if (!form.nom.trim()) errors.nom = ['Ce champ est requis.']
    if (!form.prenom.trim()) errors.prenom = ['Ce champ est requis.']
    if (!form.date_naissance) errors.date_naissance = ['Ce champ est requis.']
    if (!form.genre) errors.genre = ['Ce champ est requis.']
    if (!form.type_membre) errors.type_membre = ['Ce champ est requis.']
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGlobalError('')
    const clientErrors = validateForm()
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)
    try {
      const payload = {
        email:        form.email.trim(),
        password:     form.password,
        pseudo:       form.pseudo.trim(),
        first_name:   form.prenom.trim(),
        last_name:    form.nom.trim(),
        username:     `${form.prenom.trim().toLowerCase()}.${form.nom.trim().toLowerCase()}`,
        date_naissance: form.date_naissance,
        genre:        form.genre,
        type_membre:  form.type_membre,
      }
      await api.post('/auth/register/', payload)
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      if (data?.errors && typeof data.errors === 'object') {
        setFieldErrors(data.errors)
      }
      setGlobalError(data?.message ?? 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  const mouseStyle = {
    '--mx': `${mouse.x}%`,
    '--my': `${mouse.y}%`,
    '--rx': mouse.rx,
    '--ry': mouse.ry,
  }

  if (success) {
    return (
      <main className="auth-page" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={mouseStyle}>
        <div className="auth-orb auth-orb-a" aria-hidden="true" />
        <div className="auth-orb auth-orb-b" aria-hidden="true" />
        <section className="auth-card">
          <h1>SmartResi</h1>
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.5rem' }}>Demande envoyée !</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem', lineHeight: 1.6 }}>
              Un administrateur va examiner votre compte.<br/>
              Vous recevrez un email de confirmation dès approbation.
            </p>
          </div>
          <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
            <Link to="/login">Retour à la connexion</Link>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={mouseStyle}>
      <div className="auth-orb auth-orb-a" aria-hidden="true" />
      <div className="auth-orb auth-orb-b" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="register-title">
        <h1 id="register-title">SmartResi</h1>
        <p className="auth-subtitle">Créer un compte</p>

        <form onSubmit={handleSubmit} noValidate>
          {globalError && (
            <p className="auth-error" role="alert" aria-live="polite">{globalError}</p>
          )}

          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" />
            {fieldErrors.email && <p className="auth-error" role="alert">{fieldErrors.email[0]}</p>}
          </div>

          <div className="auth-row">
            <div className="field">
              <label htmlFor="prenom">Prénom</label>
              <input id="prenom" name="prenom" type="text" value={form.prenom} onChange={handleChange} required autoComplete="given-name" />
              {fieldErrors.prenom && <p className="auth-error" role="alert">{fieldErrors.prenom[0]}</p>}
            </div>
            <div className="field">
              <label htmlFor="nom">Nom</label>
              <input id="nom" name="nom" type="text" value={form.nom} onChange={handleChange} required autoComplete="family-name" />
              {fieldErrors.nom && <p className="auth-error" role="alert">{fieldErrors.nom[0]}</p>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="pseudo">Pseudo</label>
            <input id="pseudo" name="pseudo" type="text" value={form.pseudo} onChange={handleChange} required autoComplete="username" />
            {fieldErrors.pseudo && <p className="auth-error" role="alert">{fieldErrors.pseudo[0]}</p>}
          </div>

          <div className="auth-row">
            <div className="field">
              <label htmlFor="date_naissance">Date de naissance</label>
              <input id="date_naissance" name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange} required />
              {fieldErrors.date_naissance && <p className="auth-error" role="alert">{fieldErrors.date_naissance[0]}</p>}
            </div>
            <div className="field">
              <label htmlFor="genre">Genre</label>
              <select id="genre" name="genre" value={form.genre} onChange={handleChange} required>
                <option value="">Sélectionner</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
              {fieldErrors.genre && <p className="auth-error" role="alert">{fieldErrors.genre[0]}</p>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="type_membre">Type de membre</label>
            <select id="type_membre" name="type_membre" value={form.type_membre} onChange={handleChange} required>
              {Object.entries(TYPE_MEMBRE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            {fieldErrors.type_membre && <p className="auth-error" role="alert">{fieldErrors.type_membre[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-field">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} required minLength={8} autoComplete="new-password" />
              <button
                type="button"
                className={`password-toggle${showPassword ? ' password-toggle--visible' : ' password-toggle--hidden'}`}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                <span aria-hidden="true">👁️</span>
              </button>
            </div>
            {fieldErrors.password && <p className="auth-error" role="alert">{fieldErrors.password[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <div className="password-field">
              <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
              <button
                type="button"
                className={`password-toggle${showConfirmPassword ? ' password-toggle--visible' : ' password-toggle--hidden'}`}
                onClick={() => setShowConfirmPassword(v => !v)}
                aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                aria-pressed={showConfirmPassword}
              >
                <span aria-hidden="true">👁️</span>
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="auth-error" role="alert">{fieldErrors.confirmPassword[0]}</p>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Inscription…' : "S'inscrire"}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
        <p className="auth-footer" style={{ marginTop: '.75rem', fontSize: '.85rem' }}>
          <Link to="/">← Retour à l'accueil</Link>
        </p>
      </section>
    </main>
  )
}
