import { useState, useCallback } from 'react'
import Cookies from 'js-cookie'
import type { Member, LoginRequest } from '@shared/types'
import { loginApi, refreshApi, logoutApi } from '../api/auth'

interface AuthState {
  member: Member | null
  isAuthenticated: boolean
}

function readAuthState(): AuthState {
  const raw = Cookies.get('member')
  return {
    member: raw ? (JSON.parse(raw) as Member) : null,
    isAuthenticated: !!Cookies.get('access_token'),
  }
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(readAuthState)

  const login = useCallback(async (req: LoginRequest) => {
    const data = await loginApi(req)
    Cookies.set('access_token', data.access_token, { expires: 1 })
    Cookies.set('refresh_token', data.refresh_token, { expires: 7 })
    Cookies.set('member', JSON.stringify(data.member), { expires: 1 })
    setAuth({ member: data.member, isAuthenticated: true })
    return data
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    Cookies.remove('member')
    setAuth({ member: null, isAuthenticated: false })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await refreshApi()
      Cookies.set('access_token', data.access_token, { expires: 1 })
    } catch {
      await logout()
    }
  }, [logout])

  return { ...auth, login, logout, refresh }
}
