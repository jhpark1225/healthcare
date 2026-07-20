import { Navigate, Outlet } from 'react-router-dom'
import Cookies from 'js-cookie'

export default function ProtectedRoute() {
  const token = Cookies.get('access_token')
  return token ? <Outlet /> : <Navigate to="/" replace />
}
