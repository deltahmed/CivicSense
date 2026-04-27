import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './LoginPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    photo: null,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value, files, type } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'file' ? (files?.[0] ?? null) : value,
    }))
    setFieldErrors(prev => ({ ...prev, [name]: undefined }))
  }

  function validateForm() {
    const errors = {}

    if (!form.email.trim()) errors.email = ['Ce champ est requis.']
    else if (!EMAIL_REGEX.test(form.email)) errors.email = ['Adresse e-mail invalide.']

    if (!form.password) errors.password = ['Ce champ est requis.']
    else if (form.password.length < 8) errors.password = ['Le mot de passe doit contenir au moins 8 caracteres.']

    if (!form.confirmPassword) errors.confirmPassword = ['Ce champ est requis.']
    else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = ['Les mots de passe ne correspondent pas.']
    }

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
      const payload = new FormData()
      payload.append('email', form.email.trim())
      payload.append('password', form.password)
      payload.append('pseudo', form.pseudo.trim())
      payload.append('first_name', form.prenom.trim())
      payload.append('last_name', form.nom.trim())
      payload.append('date_naissance', form.date_naissance)
      payload.append('genre', form.genre)
      payload.append('type_membre', form.type_membre)
      payload.append('username', `${form.prenom.trim().toLowerCase()}.${form.nom.trim().toLowerCase()}`)
      if (form.photo) payload.append('photo', form.photo)

      try {
        await api.post('/auth/register/', payload)
      } catch (postError) {
        if (postError.response?.status === 404) {
          await api.post('/users/register/', payload)
        } else {
          throw postError
        }
      }
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

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>CivicSense</h1>
          <p style={{ marginTop: '1rem' }}>Un mail vous a ete envoye</p>
          <p className="auth-footer"><Link to="/login">Retour à la connexion</Link></p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <h1 id="register-title">CivicSense</h1>
        <p className="auth-subtitle">Créer un compte résident</p>

        <form onSubmit={handleSubmit} noValidate>
          {globalError && (
            <p className="auth-error" id="register-global-error" role="alert" aria-live="polite">
              {globalError}
            </p>
          )}

          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && <p id="email-error" className="auth-error" role="alert">{fieldErrors.email[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="pseudo">Pseudo</label>
            <input
              id="pseudo"
              name="pseudo"
              type="text"
              value={form.pseudo}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.pseudo ? 'pseudo-error' : undefined}
            />
            {fieldErrors.pseudo && <p id="pseudo-error" className="auth-error" role="alert">{fieldErrors.pseudo[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="nom">Nom</label>
            <input
              id="nom"
              name="nom"
              type="text"
              value={form.nom}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.nom ? 'nom-error' : undefined}
            />
            {fieldErrors.nom && <p id="nom-error" className="auth-error" role="alert">{fieldErrors.nom[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="prenom">Prénom</label>
            <input
              id="prenom"
              name="prenom"
              type="text"
              value={form.prenom}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.prenom ? 'prenom-error' : undefined}
            />
            {fieldErrors.prenom && <p id="prenom-error" className="auth-error" role="alert">{fieldErrors.prenom[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="date_naissance">Date de naissance</label>
            <input
              id="date_naissance"
              name="date_naissance"
              type="date"
              value={form.date_naissance}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.date_naissance ? 'date-naissance-error' : undefined}
            />
            {fieldErrors.date_naissance && <p id="date-naissance-error" className="auth-error" role="alert">{fieldErrors.date_naissance[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="genre">Sexe / Genre</label>
            <select
              id="genre"
              name="genre"
              value={form.genre}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.genre ? 'genre-error' : undefined}
            >
              <option value="">Sélectionner</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="autre">Autre</option>
              <option value="nr">Non renseigné</option>
            </select>
            {fieldErrors.genre && <p id="genre-error" className="auth-error" role="alert">{fieldErrors.genre[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              aria-required="true"
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && <p id="password-error" className="auth-error" role="alert">{fieldErrors.password[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {fieldErrors.confirmPassword && <p id="confirm-password-error" className="auth-error" role="alert">{fieldErrors.confirmPassword[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="type_membre">Type de membre</label>
            <select
              id="type_membre"
              name="type_membre"
              value={form.type_membre}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby={fieldErrors.type_membre ? 'type-membre-error' : undefined}
            >
              <option value="resident">Résident</option>
              <option value="referent">Référent</option>
              <option value="gardien">Gardien</option>
              <option value="gestionnaire">Gestionnaire</option>
            </select>
            {fieldErrors.type_membre && <p id="type-membre-error" className="auth-error" role="alert">{fieldErrors.type_membre[0]}</p>}
          </div>

          <div className="field">
            <label htmlFor="photo">Photo de profil (optionnel)</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={handleChange}
              aria-describedby={fieldErrors.photo ? 'photo-error' : undefined}
            />
            {fieldErrors.photo && <p id="photo-error" className="auth-error" role="alert">{fieldErrors.photo[0]}</p>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Inscription…' : "S'inscrire"}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  )
}
