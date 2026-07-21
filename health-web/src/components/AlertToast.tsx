import { useAlerts } from '../context/AlertContext'
import { formatTime } from '@shared/utils'
import styles from './AlertToast.module.css'

export default function AlertToast() {
  const { toasts, dismissToast } = useAlerts()
  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          <div className={styles.header}>
            <span className={styles.icon}>⚠</span>
            <span className={styles.title}>
              {toast.memberName ?? toast.memberId} — {toast.type}
            </span>
            <button className={styles.close} onClick={() => dismissToast(toast.id)}>✕</button>
          </div>
          <p className={styles.message}>{toast.message}</p>
          <p className={styles.time}>{formatTime(toast.measured_at)}</p>
        </div>
      ))}
    </div>
  )
}
