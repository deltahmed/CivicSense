import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import './LoginPage.css'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', pseudo: '', username: '', password: '', type_membre: 'resident' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/users/register/', form)
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      setError(data?.message ?? 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>CivicSense</h1>
          <p style={{ marginTop: '1rem' }}>
            Inscription réussie ! Vérifiez votre boîte mail pour activer votre compte.
          </p>
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
          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="pseudo">Pseudo</label>
            <input id="pseudo" name="pseudo" type="text" value={form.pseudo} onChange={handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input id="username" name="username" type="text" value={form.username} onChange={handleChange} required />
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} />
          </div>

          <div className="field">
            <label htmlFor="type_membre">Type de membre</label>
            <select id="type_membre" name="type_membre" value={form.type_membre} onChange={handleChange}>
              <option value="resident">Résident</option>
              <option value="gardien">Gardien</option>
              <option value="gestionnaire">Gestionnaire</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  )
}
