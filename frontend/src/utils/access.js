const LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']

const LEVEL_LANDING = {
  debutant: '/dashboard',
  intermediaire: '/dashboard',
  avance: '/gestion',
  expert: '/admin/users',
}

export function canAccessLevel(userLevel, minLevel) {
  if (!minLevel) return true
  const userIndex = LEVEL_ORDER.indexOf(userLevel)
  const minIndex = LEVEL_ORDER.indexOf(minLevel)
  return userIndex !== -1 && minIndex !== -1 && userIndex >= minIndex
}

export function getLandingRouteForLevel(level) {
  return LEVEL_LANDING[level] ?? '/dashboard'
}

export function getDeniedRouteForLevel(level) {
  return getLandingRouteForLevel(level)
}

export function getAuthenticatedNavLinks(user) {
  const links = [
    { to: '/dashboard', label: 'Accueil' },
    { to: '/objects', label: 'Objets' },
    { to: '/services', label: 'Services' },
    { to: '/users', label: 'Membres' },
    { to: '/search', label: 'Recherche' },
  ]

  if (canAccessLevel(user?.level, 'avance')) {
    links.push({ to: '/gestion', label: 'Gestion' })
    links.push({ to: '/alerts', label: 'Alertes' })
  }

  if (user?.level === 'expert') {
    links.push({ to: '/admin/users', label: 'Administration' })
  }

  return links
}