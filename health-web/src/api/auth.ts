import type { LoginRequest, LoginResponse, RefreshResponse } from '@shared/types'
import api from './axiosInstance'
import Cookies from 'js-cookie'

export async function loginApi(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', req)
  return data
}

export async function refreshApi(): Promise<RefreshResponse> {
  const refresh_token = Cookies.get('refresh_token')
  const { data } = await api.post<RefreshResponse>('/auth/refresh', { refresh_token })
  return data
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout').catch(() => {})
}
