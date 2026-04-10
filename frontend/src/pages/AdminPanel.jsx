import { useAuth } from '../context/AuthContext';

export default function AdminPanel() {
  const { user } = useAuth();

  return (
    <>
      <title>Administration — CivicSense</title>
      <meta name="description" content="Panneau d'administration CivicSense réservé aux experts. Gérez les utilisateurs et la configuration." />

      <main>
        <h1>Administration</h1>
        <p>Connecté en tant que : <strong>{user?.firstName} {user?.lastName}</strong></p>
        <p>Niveau : <strong>{user?.level}</strong></p>
      </main>
    </>
  );
}
