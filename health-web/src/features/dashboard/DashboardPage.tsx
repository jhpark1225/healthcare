import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../../api/members'
import { useAuth } from '../../hooks/useAuth'
import { useAlerts } from '../../context/AlertContext'
import type { DashboardResponse } from '@shared/types'
import Sidebar from '../../components/Sidebar'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { member } = useAuth()
  const navigate = useNavigate()
  const { addAlert } = useAlerts()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const sendTestAlert = () => {
    addAlert({
      memberId: 'test-001',
      type: 'heartRate',
      value: 112,
      message: '심박수 이상: 112 bpm (테스트)',
      measured_at: new Date().toISOString(),
    }, '테스트 환자')
  }

  // Non-doctors see their own page
  useEffect(() => {
    if (member && member.member_type !== 'DOCT') {
      void navigate(`/members/${member.member_id}`, { replace: true })
    }
  }, [member, navigate])

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.pageTitle}>대시보드</h1>
            <button className={styles.testAlertBtn} onClick={sendTestAlert}>
              🔔 테스트 알람
            </button>
          </div>
        </header>

        {loading ? (
          <div className={styles.skeletonWrap}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : !dashboard ? (
          <p className={styles.empty}>데이터를 불러올 수 없습니다.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className={styles.summaryRow}>
              <SummaryCard label="전체 환자" value={dashboard.total} unit="명" />
              <SummaryCard label="이상 감지" value={dashboard.abnormal} unit="명" danger={dashboard.abnormal > 0} />
              <SummaryCard label="오늘 수신 건수" value={dashboard.todayCount.toLocaleString()} unit="건" />
            </div>

            {/* Patient grid */}
            <div className={styles.grid}>
              {dashboard.patients.map(p => (
                <button
                  key={p.member_id}
                  className={`${styles.patientCard} ${p.hasAlert ? styles.patientCardAlert : ''}`}
                  onClick={() => void navigate(`/members/${p.member_id}`)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.patientName}>{p.name}</span>
                    {p.hasAlert && <span className={styles.alertDot}>●</span>}
                  </div>
                  <p className={styles.patientId}>{p.member_id}</p>

                  <div className={styles.vitals}>
                    <VitalItem
                      label="심박수"
                      value={p.latestHeartRate ? `${p.latestHeartRate.heart_rate} bpm` : '-'}
                      danger={(p.latestHeartRate?.heart_rate ?? 0) >= 100}
                    />
                    <VitalItem
                      label="혈압"
                      value={p.latestBP ? `${p.latestBP.systolic}/${p.latestBP.diastolic}` : '-'}
                      danger={(p.latestBP?.systolic ?? 0) >= 140}
                    />
                    <VitalItem
                      label="혈당"
                      value={p.latestGlucose ? `${p.latestGlucose.glucose_value} mg/dL` : '-'}
                      danger={p.latestGlucose?.status === 'elevated' || p.latestGlucose?.status === 'high'}
                    />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, unit, danger,
}: { label: string; value: number | string; unit: string; danger?: boolean }) {
  return (
    <div className={`${styles.summaryCard} ${danger ? styles.summaryCardDanger : ''}`}>
      <p className={styles.summaryLabel}>{label}</p>
      <p className={`${styles.summaryValue} ${danger ? styles.summaryValueDanger : ''}`}>
        {value}<span className={styles.summaryUnit}>{unit}</span>
      </p>
    </div>
  )
}

function VitalItem({
  label, value, danger,
}: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={styles.vitalItem}>
      <span className={styles.vitalLabel}>{label}</span>
      <span className={`${styles.vitalValue} ${danger ? styles.vitalValueDanger : ''}`}>{value}</span>
    </div>
  )
}
