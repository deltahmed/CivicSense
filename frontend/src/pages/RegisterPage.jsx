import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (err.data?.errors) {
        const mapped = {};
        for (const e of err.data.errors) mapped[e.path] = e.msg;
        setErrors(mapped);
      } else {
        setErrors({ global: err.message || 'Erreur lors de l\'inscription' });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <title>Créer un compte — CivicSense</title>
      <meta name="description" content="Créez votre compte CivicSense pour accéder à la plateforme de gestion IoT de votre résidence." />

      <main>
        <h1>Créer un compte</h1>

        <form onSubmit={handleSubmit} noValidate>
          {errors.global && (
            <p role="alert" aria-live="polite">{errors.global}</p>
          )}

          <div>
            <label htmlFor="firstName">Prénom <span aria-hidden="true">*</span></label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              aria-required="true"
              aria-describedby={errors.firstName ? 'err-firstName' : undefined}
              required
            />
            {errors.firstName && (
              <p id="err-firstName" aria-live="polite">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName">Nom <span aria-hidden="true">*</span></label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              aria-required="true"
              aria-describedby={errors.lastName ? 'err-lastName' : undefined}
              required
            />
            {errors.lastName && (
              <p id="err-lastName" aria-live="polite">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email">Adresse e-mail <span aria-hidden="true">*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'err-email' : undefined}
              required
            />
            {errors.email && (
              <p id="err-email" aria-live="polite">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password">Mot de passe <span aria-hidden="true">*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={errors.password ? 'err-password' : undefined}
              required
            />
            {errors.password && (
              <p id="err-password" aria-live="polite">{errors.password}</p>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p>
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </main>
    </>
  );
}
