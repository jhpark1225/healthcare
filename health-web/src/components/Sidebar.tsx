import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Sidebar.module.css'

interface SidebarProps {
  currentPatientName?: string
}

export default function Sidebar({ currentPatientName }: SidebarProps) {
  const { member, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    void logout().then(() => navigate('/'))
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>♥</span>
          <span className={styles.logoText}>건강 모니터링</span>
        </div>

        <nav className={styles.nav}>
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
        <div className={styles.userInfo}>
          <p className={styles.userName}>{member?.name ?? '-'}</p>
          <p className={styles.userRole}>
            {member?.member_type === 'DOCT' ? '의사' : '사용자'}
          </p>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </aside>
  )
}
