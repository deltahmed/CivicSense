const BASE_URL = '/api';

/**
 * Wrapper autour de fetch pour les appels à l'API backend.
 * Inclut les cookies automatiquement (credentials: 'include').
 *
 * @param {string} path  - Chemin relatif, ex. '/auth/me'
 * @param {RequestInit} options - Options fetch
 * @returns {Promise<any>} - Corps JSON parsé
 */
async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || 'Erreur réseau');
    err.status = response.status;
    err.data   = data;
    throw err;
  }

  return data;
}

export const authApi = {
  register: (body)  => api('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body)  => api('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  logout:   ()      => api('/auth/logout',   { method: 'POST' }),
  me:       ()      => api('/auth/me'),
};

export default api;
