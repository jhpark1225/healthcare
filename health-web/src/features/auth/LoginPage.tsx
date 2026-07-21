import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [memberId, setMemberId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const isDisabled = !memberId.trim() || !password.trim() || loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isDisabled) return
    setError('')
    setLoading(true)
    try {
      const res = await login({ member_id: memberId, password })
      // DOCT → dashboard, PATI → own detail
      if (res.member.member_type === 'PATI') {
        void navigate(`/members/${res.member.member_id}`, { replace: true })
      } else {
        void navigate('/dashboard', { replace: true })
      }
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Left brand panel */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <span className={styles.brandIcon}>♥</span>
          <h1 className={styles.brandTitle}>건강 모니터링</h1>
          <p className={styles.brandDesc}>
            실시간 환자 건강 데이터를<br />
            언제 어디서나 확인하세요.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>로그인</h2>
          <p className={styles.formSubtitle}>의사·관리자 전용 대시보드</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <input
              className={styles.input}
              type="text"
              placeholder="아이디"
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              autoComplete="username"
            />
            <input
              className={styles.input}
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={isDisabled}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
