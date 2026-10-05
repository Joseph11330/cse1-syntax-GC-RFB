import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000' })

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('gc_token') || sessionStorage.getItem('gc_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

export default api
