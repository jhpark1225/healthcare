import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import MemberListPage from '../features/members/MemberListPage'
import MemberDetailPage from '../features/detail/MemberDetailPage'
import ChatPage from '../features/chat/ChatPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/members', element: <MemberListPage /> },
      { path: '/members/:memberId', element: <MemberDetailPage /> },
      { path: '/chat', element: <ChatPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
