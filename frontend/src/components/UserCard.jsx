import { Link } from 'react-router-dom'
import './UserCard.css'

export default function UserCard({ user }) {
  return (
    <Link to={`/users/${user.id}`} className="user-card">
      <div className="user-card-image">
        {user.photo ? (
          <img src={user.photo} alt={user.pseudo} />
        ) : (
          <div className="user-card-avatar">{user.pseudo.charAt(0).toUpperCase()}</div>
        )}
      </div>
      <div className="user-card-content">
        <h3 className="user-card-pseudo">{user.pseudo}</h3>
        <div className="user-card-badges">
          <span className="badge badge-level">{user.level}</span>
          <span className="badge badge-type">{user.type_membre}</span>
        </div>
        {user.points !== null && (
          <p className="user-card-points">{user.points} pts</p>
        )}
      </div>
    </Link>
  )
}
