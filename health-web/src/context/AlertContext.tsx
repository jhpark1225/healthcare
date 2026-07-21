import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import Cookies from 'js-cookie'
import type { WsAlertEvent, Member } from '@shared/types'
import { getMemberList } from '../api/members'

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

  // Global WS: subscribe to alert events regardless of current page
  useEffect(() => {
    const token = Cookies.get('access_token')
    const memberRaw = Cookies.get('member')
    if (!token || !memberRaw) return

    const member: Member = JSON.parse(memberRaw) as Member
    const wsUrl = import.meta.env.VITE_WS_URL as string

    const socket = io(`${wsUrl}/health-ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      if (member.member_type === 'DOCT') {
        // Subscribe to all patient rooms so doctor gets every alert
        getMemberList()
          .then(patients => {
            patients
              .filter(p => p.member_type === 'PATI')
              .forEach(p => socket.emit('subscribe', { memberId: p.member_id }))
          })
          .catch(() => {})
      } else {
        socket.emit('subscribe', { memberId: member.member_id })
      }
    })

    socket.on('alert', (d: WsAlertEvent) => {
      addAlert(d)
    })

    return () => { socket.disconnect() }
  }, [addAlert])

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
