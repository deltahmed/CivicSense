import { useState, useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './AppLayout.css'

function getNavLinks(user) {
  const links = [
    { to: '/dashboard', label: 'Accueil' },
    { to: '/objects',   label: 'Objets' },
    { to: '/services',  label: 'Services' },
    { to: '/users',     label: 'Membres' },
    { to: '/search',    label: 'Recherche' },
  ]
  if (user?.level === 'expert') {
    links.push({ to: '/alerts',          label: 'Alertes' })
    links.push({ to: '/admin/users',     label: 'Admin' })
    links.push({ to: '/admin/pending',   label: 'Inscriptions', badge: 'pending' })
    links.push({ to: '/admin/deletions', label: 'Suppressions', badge: 'deletions' })
  }
  return links
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [pendingCount, setPendingCount]     = useState(0)
  const [deletionsCount, setDeletionsCount] = useState(0)
  const userMenuRef = useRef(null)
  const navLinks = getNavLinks(user)

  useEffect(() => {
    if (user?.level !== 'expert') return
    api.get('/admin/users/pending/')
      .then(res => setPendingCount(res.data.data?.length ?? 0))
      .catch(() => {})
    api.get('/deletion-requests/')
      .then(res => setDeletionsCount(res.data.data?.length ?? 0))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    function onClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/dashboard" className="header-logo" aria-label="CivicSense — Accueil">
            <span className="logo-mark" aria-hidden="true" />
            <span className="logo-text">CivicSense</span>
          </Link>

          <nav
            className={`header-nav${menuOpen ? ' nav-open' : ''}`}
            aria-label="Navigation principale"
            id="main-nav"
          >
            <ul role="list">
              {navLinks.map(link => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                    {link.badge === 'pending'   && pendingCount   > 0 && (
                      <span className="nav-badge">{pendingCount}</span>
                    )}
                    {link.badge === 'deletions' && deletionsCount > 0 && (
                      <span className="nav-badge nav-badge--orange">{deletionsCount}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-end">
            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-btn"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={`Menu utilisateur — ${user?.pseudo}`}
              >
                <span className="user-avatar" aria-hidden="true">
                  {user?.pseudo?.charAt(0).toUpperCase()}
                </span>
                <span className="user-pseudo">{user?.pseudo}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" role="menu" aria-label="Options utilisateur">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.pseudo}</p>
                    <p className="dropdown-pts">{user?.points} pts</p>
                  </div>
                  <div className="dropdown-divider" />
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-item-danger"
                    role="menuitem"
                    onClick={logout}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>

            <button
              className={`hamburger${menuOpen ? ' is-open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <p>© 2026 CivicSense — Projet ING1</p>
          <p className="footer-user">
            Connecté en tant que <strong>{user?.pseudo}</strong>
          </p>
        </div>
      </footer>
    </div>
  )
}
