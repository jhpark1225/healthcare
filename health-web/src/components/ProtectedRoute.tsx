import { Navigate, Outlet } from 'react-router-dom'
import Cookies from 'js-cookie'
import { AlertProvider } from '../context/AlertContext'
import AlertToast from './AlertToast'

export default function ProtectedRoute() {
  const token = Cookies.get('access_token')
  if (!token) return <Navigate to="/" replace />
  return (
    <AlertProvider>
      <Outlet />
      <AlertToast />
    </AlertProvider>
  )
}
