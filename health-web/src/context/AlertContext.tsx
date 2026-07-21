import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { WsAlertEvent } from '@shared/types'

export interface AlertEntry extends WsAlertEvent {
  id: string
  memberName?: string
  read: boolean
}

interface AlertContextValue {
  alerts: AlertEntry[]
  toasts: AlertEntry[]
  addAlert: (alert: WsAlertEvent, memberName?: string) => void
  dismissToast: (id: string) => void
  markAllRead: () => void
  unreadCount: number
}

const AlertContext = createContext<AlertContextValue | null>(null)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertEntry[]>([])
  const [toasts, setToasts] = useState<AlertEntry[]>([])
  const counter = useRef(0)

  const addAlert = useCallback((alert: WsAlertEvent, memberName?: string) => {
    const id = `a-${++counter.current}`
    const entry: AlertEntry = { ...alert, id, memberName, read: false }

    setAlerts(prev => [entry, ...prev].slice(0, 20))
    setToasts(prev => [entry, ...prev])

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }, [])

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <AlertContext.Provider value={{ alerts, toasts, addAlert, dismissToast, markAllRead, unreadCount }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider')
  return ctx
}
