import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <>
      <title>Page introuvable — CivicSense</title>
      <meta name="description" content="La page que vous cherchez n'existe pas sur CivicSense." />

      <main>
        <h1>404 — Page introuvable</h1>
        <p>Cette page n'existe pas.</p>
        <Link to="/">Retour à l'accueil</Link>
      </main>
    </>
  );
}
