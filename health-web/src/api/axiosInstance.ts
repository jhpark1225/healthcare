import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    try {
      const refreshToken = Cookies.get('refresh_token')
      const { data } = await axios.post<{ access_token: string }>(
        `${import.meta.env.VITE_API_URL as string}/auth/refresh`,
        { refresh_token: refreshToken }
      )
      Cookies.set('access_token', data.access_token, { expires: 1 })
      ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.access_token}`
      return api(originalRequest)
    } catch {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      Cookies.remove('member')
      window.location.href = '/'
      return Promise.reject(error)
    }
  }
)

export default api
