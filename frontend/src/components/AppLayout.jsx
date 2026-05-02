import { useState, useEffect, useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { getAuthenticatedNavLinks } from '../utils/access'
import './AppLayout.css'

const NAV_ICONS = {
  '/dashboard':      '🏠',
  '/objects':        '📦',
  '/services':       '⚡',
  '/users':          '👥',
  '/search':         '🔍',
  '/gestion':        '⚙️',
  '/alerts':         '🔔',
  '/admin/users':    '🛡️',
  '/admin/pending':  '📋',
  '/admin/deletions':'🗑️',
}

function getNavLinks(user) {
  const links = getAuthenticatedNavLinks(user)
  if (user?.level === 'expert') {
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

          {/* Nav desktop — liens horizontaux, cachée sur mobile */}
          <nav className="header-nav" aria-label="Navigation principale" id="main-nav">
            <ul role="list">
              {navLinks.map(link => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
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
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer mobile — EN DEHORS du header pour éviter les conflits de stacking context */}
      {menuOpen && (
        <div
          className="mobile-drawer"
          id="mobile-nav"
          aria-label="Menu mobile"
          role="dialog"
          aria-modal="true"
        >
          <div className="mobile-drawer-user">
            <span className="mobile-drawer-avatar" aria-hidden="true">
              {user?.pseudo?.charAt(0).toUpperCase()}
            </span>
            <div className="mobile-drawer-info">
              <span className="mobile-drawer-name">{user?.pseudo}</span>
              <span className={`level-chip level-${user?.level}`}>{user?.level}</span>
              <span className="mobile-drawer-pts">{user?.points ?? 0} pts</span>
            </div>
          </div>

          <nav aria-label="Navigation mobile">
            <ul role="list" className="mobile-drawer-list">
              {navLinks.map(link => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => `mobile-drawer-link${isActive ? ' mobile-drawer-link--active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="mobile-drawer-icon" aria-hidden="true">{NAV_ICONS[link.to] ?? '•'}</span>
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

          <div className="mobile-drawer-footer">
            <Link
              to="/profile"
              className="mobile-drawer-action"
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">👤</span> Mon profil
            </Link>
            <button className="mobile-drawer-action mobile-drawer-logout" onClick={logout}>
              <span aria-hidden="true">🚪</span> Déconnexion
            </button>
          </div>
        </div>
      )}

      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <p>© 2026 CivicSense</p>
          <p className="footer-user">
            Connecté en tant que <strong>{user?.pseudo}</strong>
          </p>
        </div>
      </footer>
    </div>
  )
}
