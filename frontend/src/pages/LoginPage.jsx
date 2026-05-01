import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      const level = data.data?.level ?? 'debutant'
      const redirects = { debutant: '/dashboard', intermediaire: '/dashboard', avance: '/gestion', expert: '/admin' }
      navigate(redirects[level] ?? '/dashboard', { replace: true })
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message ?? ''
      if (status === 403 || msg.toLowerCase().includes('vérifié') || msg.toLowerCase().includes('verifie')) {
        setError('Votre compte est en attente de validation par un administrateur.')
      } else {
        setError(msg || 'Identifiants incorrects.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="auth-page"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mx': `${mouse.x}%`,
        '--my': `${mouse.y}%`,
        '--rx': mouse.rx,
        '--ry': mouse.ry,
      }}
    >
      <div className="auth-orb auth-orb-a" aria-hidden="true" />
      <div className="auth-orb auth-orb-b" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">CivicSense</h1>
        <p className="auth-subtitle">Connectez-vous à votre résidence</p>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <p className="auth-error" id="login-error" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-footer">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>
      </section>
    </main>
  )
}
