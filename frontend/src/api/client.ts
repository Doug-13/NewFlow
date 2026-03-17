import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5109/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status
    const { isPlatformAdmin } = useAuthStore.getState()

    // Platform admins não têm refresh token no banco — redireciona para login
    if ((status === 401 || status === 403) && isPlatformAdmin) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (status === 401 && !isRefreshing) {
      isRefreshing = true
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        const { accessToken, enabledModules } = res.data
        const state = useAuthStore.getState()
        useAuthStore.getState().setAuth({
          user: state.user,
          platformAdmin: state.platformAdmin,
          token: accessToken,
          enabledModules: enabledModules ?? state.enabledModules,
        })
        error.config.headers.Authorization = `Bearer ${accessToken}`
        isRefreshing = false
        return api(error.config)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)
