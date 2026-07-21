import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAlerts } from '../context/AlertContext'
import { formatTime } from '@shared/utils'
import styles from './Sidebar.module.css'

interface SidebarProps {
  currentPatientName?: string
}

export default function Sidebar({ currentPatientName }: SidebarProps) {
  const { member, logout } = useAuth()
  const { alerts, unreadCount, markAllRead } = useAlerts()
  const [showNotif, setShowNotif] = useState(false)
  const navigate = useNavigate()
  const isDoct = member?.member_type === 'DOCT'

  const handleLogout = () => {
    void logout().then(() => navigate('/'))
  }

  const toggleNotif = () => {
    setShowNotif(prev => !prev)
    if (!showNotif) markAllRead()
  }

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.top}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>♥</span>
            <span className={styles.logoText}>건강 모니터링</span>
          </div>

          <nav className={styles.nav}>
            {isDoct && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                대시보드
              </NavLink>
            )}
            <NavLink
              to="/members"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              end
            >
              환자 목록
            </NavLink>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              AI 상담
            </NavLink>
          </nav>

          {currentPatientName && (
            <div className={styles.patientBox}>
              <p className={styles.patientLabel}>현재 환자</p>
              <p className={styles.patientName}>{currentPatientName}</p>
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          {/* Bell notification button */}
          <button className={styles.bellBtn} onClick={toggleNotif} aria-label="알림">
            <span className={styles.bellIcon}>🔔</span>
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          <div className={styles.userInfo}>
            <p className={styles.userName}>{member?.name ?? '-'}</p>
            <p className={styles.userRole}>
              {isDoct ? '의사' : '사용자'}
            </p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* Notification panel */}
      {showNotif && (
        <>
          <div className={styles.notifOverlay} onClick={() => setShowNotif(false)} />
          <div className={styles.notifPanel}>
            <div className={styles.notifHeader}>
              <span className={styles.notifTitle}>최근 알림</span>
              <button className={styles.notifClose} onClick={() => setShowNotif(false)}>✕</button>
            </div>
            {alerts.length === 0 ? (
              <p className={styles.notifEmpty}>알림 없음</p>
            ) : (
              <ul className={styles.notifList}>
                {alerts.map(a => (
                  <li key={a.id} className={`${styles.notifItem} ${a.read ? styles.notifRead : ''}`}>
                    <div className={styles.notifItemHeader}>
                      <span className={styles.notifType}>{a.memberName ?? a.memberId} — {a.type}</span>
                    </div>
                    <p className={styles.notifMsg}>{a.message}</p>
                    <p className={styles.notifTime}>{formatTime(a.measured_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  )
}
