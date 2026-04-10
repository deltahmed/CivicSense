import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <title>Tableau de bord — CivicSense</title>
      <meta name="description" content="Accédez à vos objets connectés et services depuis votre tableau de bord CivicSense." />

      <header>
        <h1>Tableau de bord</h1>
        <button type="button" onClick={handleLogout}>
          Se déconnecter
        </button>
      </header>

      <main>
        <section aria-labelledby="welcome-title">
          <h2 id="welcome-title">
            Bienvenue, {user?.firstName}
          </h2>
          <p>Niveau : <strong>{user?.level}</strong></p>
          <p>Points : <strong>{user?.points}</strong></p>
        </section>
      </main>
    </>
  );
}
