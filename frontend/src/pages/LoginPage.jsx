import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <title>Connexion — CivicSense</title>
      <meta name="description" content="Connectez-vous à votre espace CivicSense pour accéder à vos objets connectés." />

      <main>
        <h1>Connexion</h1>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <p role="alert" aria-live="polite">{error}</p>
          )}

          <div>
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              aria-required="true"
              required
            />
          </div>

          <div>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              aria-required="true"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p>
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </main>
    </>
  );
}
