// src/services/api.js (o donde creaste tu instancia)
import axios from 'axios'
import { loader } from '@/stores/loader'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8082/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  
  const user = localStorage.getItem('user') 
  const uid = JSON.parse(user || '{}').user_id
  if (!uid) return config

  
  const method = (config.method || 'get').toLowerCase()

  if (['post', 'put', 'patch'].includes(method)) {
    if (config.data instanceof FormData) {
      // multipart: lo agregamos como campo más
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

  // muestra overlay salvo que lo pidan explícitamente
  if (!config.meta?.skipLoader) loader.start()
  return config
}, (error) => {
  loader.stop()
  return Promise.reject(error)
})

api.interceptors.response.use((response) => {
  if (!response.config.meta?.skipLoader) loader.stop()
  return response
}, (error) => {
  // intenta leer config del request que falló
  if (!error.config?.meta?.skipLoader) loader.stop()
  return Promise.reject(error)
})

export default api
