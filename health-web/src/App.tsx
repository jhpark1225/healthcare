import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AlertProvider } from './context/AlertContext'
import AlertToast from './components/AlertToast'

export default function App() {
  return (
    <AlertProvider>
      <RouterProvider router={router} />
      <AlertToast />
    </AlertProvider>
  )
}
