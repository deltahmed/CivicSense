import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      <title>CivicSense — Résidence intelligente IoT</title>
      <meta
        name="description"
        content="CivicSense est une plateforme de gestion IoT pour résidences intelligentes. Consultez et gérez vos objets connectés."
      />

      <main>
        <section aria-labelledby="hero-title">
          <h1 id="hero-title">CivicSense</h1>
          <p>Plateforme de gestion IoT pour votre résidence intelligente.</p>

          <nav aria-label="Actions principales">
            <Link to="/login">Se connecter</Link>
            <Link to="/register">Créer un compte</Link>
          </nav>
        </section>
      </main>
    </>
  );
}
