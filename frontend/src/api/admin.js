import api from './index'

export const getAllUsers = () => api.get('/admin/users/')
export const getUserDetail = (id) => api.get(`/admin/users/${id}/`)
export const updateUser = (id, data) => api.put(`/admin/users/${id}/`, data)
export const deleteUser = (id) => api.delete(`/admin/users/${id}/`)
export const setUserLevel = (id, level) => api.put(`/admin/users/${id}/set-level/`, { level })
export const setUserPoints = (id, points) => api.put(`/admin/users/${id}/set-points/`, { points })
export const getUserHistory = (id) => api.get(`/admin/users/${id}/history/`)

export const changePassword = (data) => api.post('/admin/change-password/', data)
export const downloadBackup = () => api.get('/admin/backup/', { responseType: 'blob' })
export const getIntegrityCheck = () => api.get('/admin/integrity-check/')
export const fixIntegrity = () => api.post('/admin/integrity-fix/')

export const getSettings = () => api.get('/admin/settings/')
export const updateSettings = (data, config = {}) => api.put('/admin/settings/', data, config)

export const getAdminServices = (params = {}) => api.get('/admin/services/', { params })
export const createAdminService = (data) => api.post('/admin/services/', data)
export const updateAdminService = (id, data) => api.put(`/admin/services/${id}/`, data)
export const deleteAdminService = (id) => api.delete(`/admin/services/${id}/`)
