// src/services/api.js
import axios from 'axios'
import { loader } from '@/stores/loader'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8082/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// --- REQUEST INTERCEPTOR (Se mantiene igual) ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  
  const user = localStorage.getItem('user') 
  const uid = JSON.parse(user || '{}').user_id
  
  // Si hay user_id, lo inyectamos
  if (uid) {
    const method = (config.method || 'get').toLowerCase()

    if (['post', 'put', 'patch'].includes(method)) {
      if (config.data instanceof FormData) {
        // multipart: lo agregamos como campo más si no existe
        if (!config.data.has('user_id')) {
          config.data.append('user_id', uid) 
        }
      } else {
        // JSON “normal”: merge sin pisar si ya viene
        config.data = { user_id: uid, ...(config.data || {}) }
      }
    } else {
      // GET/DELETE → va en query string
      config.params = { ...(config.params || {}), user_id: uid}
    }
  }

  // Overlay blur global SOLO si el caller lo pide (meta.showLoader), p.ej.
  // exportaciones a Google Sheets. El resto de vistas usa su propio skeleton.
  // (los meta.skipLoader que quedan en services son inofensivos: ya es opt-in)
  if (config.meta?.showLoader) loader.start()
  return config
}, (error) => {
  if (error.config?.meta?.showLoader) loader.stop()
  return Promise.reject(error)
})


// --- RESPONSE INTERCEPTOR (Aquí está el cambio) ---
api.interceptors.response.use(
  (response) => {
    // Éxito: Detenemos loader
    if (response.config.meta?.showLoader) loader.stop()
    return response
  },
  (error) => {
    // Error: Detenemos loader
    if (error.config?.meta?.showLoader) loader.stop()

    // -----------------------------------------------------------
    // LÓGICA DE AUTO-LOGOUT (Token Expirado)
    // -----------------------------------------------------------
    if (error.response && error.response.status === 401) {
      console.warn('Sesión expirada. Redirigiendo al login...')
      
      // 1. Limpiar almacenamiento
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // 2. Redirigir al login
      // Verificamos que no estemos ya en el login para evitar bucles
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    // -----------------------------------------------------------

    return Promise.reject(error)
  }
)

export default api