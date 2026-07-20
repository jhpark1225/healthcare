import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line,
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { useHealthSocket } from '../../hooks/useHealthSocket'
import { getMember } from '../../api/members'
import type { Member, WsAlertEvent } from '@shared/types'
import { formatDate, genderLabel, calcAge, formatTime } from '@shared/utils'
import Sidebar from '../../components/Sidebar'
import styles from './MemberDetailPage.module.css'

// ── Chart color constants ────────────────────────────────────────────────────
const C = {
  primary: '#0066cc',
  secondary: '#2997ff',
  warning: '#ff9500',
  danger: '#ff3b30',
  safe: '#34c759',
  grid: '#f0f0f0',
  text: '#7a7a7a',
  canvas: '#ffffff',
  hairline: '#e0e0e0',
}

const TOOLTIP_STYLE = {
  background: C.canvas,
  border: `1px solid ${C.hairline}`,
  borderRadius: '8px',
  fontSize: '13px',
}

const AXIS_TICK = { fontSize: 11, fill: C.text }

// ── Main component ───────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()
  const { data, loading, connected } = useHealthSocket(memberId ?? '')
  const [memberInfo, setMemberInfo] = useState<Member | null>(null)
  const [activeAlert, setActiveAlert] = useState<WsAlertEvent | null>(null)
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch member detail (includes diseases)
  useEffect(() => {
    if (!memberId) return
    getMember(memberId).then(setMemberInfo).catch(() => {})
  }, [memberId])

  // Auto-dismiss alert after 5s when new alert arrives
  const alertCount = data.alerts.length
  useEffect(() => {
    if (alertCount === 0) return
    setActiveAlert(data.alerts[0])
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current)
    alertTimerRef.current = setTimeout(() => setActiveAlert(null), 5000)
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current)
    }
  }, [alertCount, data.alerts])

  if (!memberId) {
    void navigate('/members')
    return null
  }

  // Prepare chart data (reverse: oldest → newest for left→right display)
  const hrData = [...data.heartRates].reverse().map(r => ({
    time: formatTime(r.measured_at),
    bpm: r.heart_rate,
    abnormal: r.heart_rate >= 100 ? r.heart_rate : null,
  }))

  const bpData = [...data.bloodPressures].reverse().map(r => ({
    time: formatTime(r.measured_at),
    systolic: r.systolic,
    diastolic: r.diastolic,
  }))

  const glucoseData = [...data.glucoses].reverse().map(r => ({
    time: formatTime(r.measured_at),
    glucose: r.glucose_value,
    status: r.status,
  }))

  const weightData = [...data.weights].reverse().map(r => ({
    time: formatTime(r.measured_at),
    weight: r.weight_kg,
    bmi: r.bmi,
    muscle: r.skeletal_muscle_mass ?? 0,
    fat: r.body_fat_percentage ?? 0,
  }))

  const latestHr = data.heartRates[0]
  const latestBp = data.bloodPressures[0]
  const latestGlu = data.glucoses[0]
  const latestWt = data.weights[0]
  const latestStep = data.steps[0]

  const hrAbnormal = !!latestHr && latestHr.heart_rate >= 100
  const bpAbnormal = !!latestBp && (latestBp.systolic >= 140 || latestBp.diastolic >= 90)
  const gluStatus = latestGlu?.status ?? null

  return (
    <div className={styles.layout}>
      <Sidebar currentPatientName={memberInfo?.name ?? memberId} />

      <div className={styles.content}>

        {/* Alert banner */}
        {activeAlert && (
          <div className={styles.alertBanner}>
            <span className={styles.alertIcon}>⚠</span>
            <span className={styles.alertMsg}>{activeAlert.message}</span>
            <button className={styles.alertClose} onClick={() => setActiveAlert(null)}>✕</button>
          </div>
        )}

        {/* Profile banner */}
        <div className={styles.profile}>
          <div className={styles.profileAvatar}>
            {memberInfo ? genderLabel(memberInfo.gender) : '?'}
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileNameRow}>
              <h1 className={styles.profileName}>{memberInfo?.name ?? memberId}</h1>
              <span className={`${styles.connDot} ${connected ? styles.connDotOn : styles.connDotOff}`} />
              <span className={`${styles.connLabel} ${connected ? styles.connLabelOn : styles.connLabelOff}`}>
                {connected ? '연결 중' : '연결 끊김'}
              </span>
            </div>
            <p className={styles.profileMeta}>
              {memberInfo?.gender === 'M' ? '남' : memberInfo?.gender === 'F' ? '여' : '-'}
              {memberInfo?.birth_date && (
                <>
                  {' · '}{formatDate(memberInfo.birth_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))}
                  {' · '}{calcAge(memberInfo.birth_date)}세
                </>
              )}
            </p>
            {memberInfo?.diseases && memberInfo.diseases.length > 0 && (
              <div className={styles.tags}>
                {memberInfo.diseases.map(d => (
                  <span key={d.diagnosis_seq} className={styles.tag}>{d.disease_name_kr}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className={styles.hint}>건강 데이터 불러오는 중...</p>
        ) : (
          <div className={styles.chartGrid}>

            {/* Heart Rate */}
            <ChartCard
              title="심박수"
              unit="bpm"
              latest={latestHr ? `${latestHr.heart_rate} bpm` : '-'}
              latestTime={latestHr?.measured_at}
              badge={hrAbnormal ? { text: '이상', type: 'danger' } : undefined}
            >
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={hrData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={100} stroke={C.danger} strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="bpm" stroke={hrAbnormal ? C.danger : C.primary}
                    strokeWidth={2} dot={{ r: 2, fill: hrAbnormal ? C.danger : C.primary }}
                    activeDot={{ r: 4 }} name="심박수" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Blood Pressure */}
            <ChartCard
              title="혈압"
              unit="mmHg"
              latest={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '-'}
              latestTime={latestBp?.measured_at}
              badge={bpAbnormal ? { text: '이상', type: 'danger' } : undefined}
            >
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={bpData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={140} stroke={C.danger} strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={90} stroke={C.warning} strokeDasharray="4 4" strokeWidth={1} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="systolic" stroke={bpAbnormal ? C.danger : C.primary}
                    strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="수축기" />
                  <Line type="monotone" dataKey="diastolic" stroke={C.secondary}
                    strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="이완기" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Glucose */}
            <ChartCard
              title="혈당"
              unit="mg/dL"
              latest={latestGlu ? `${latestGlu.glucose_value} mg/dL` : '-'}
              latestTime={latestGlu?.measured_at}
              badge={
                gluStatus === 'high' ? { text: '고혈당', type: 'danger' } :
                gluStatus === 'elevated' ? { text: '주의', type: 'warning' } : undefined
              }
            >
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={glucoseData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={140} stroke={C.danger} strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={110} stroke={C.warning} strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="glucose"
                    stroke={gluStatus === 'high' ? C.danger : gluStatus === 'elevated' ? C.warning : C.primary}
                    strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="혈당" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Steps */}
            <ChartCard
              title="걸음수"
              unit="걸음"
              latest={latestStep ? `${latestStep.cumulative_steps.toLocaleString()} 걸음` : '-'}
              latestTime={latestStep?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={[...data.steps].reverse().map(r => ({
                    time: formatTime(r.measured_at),
                    steps: r.cumulative_steps,
                  }))}
                  margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="steps" fill={C.primary} radius={[2, 2, 0, 0]} name="걸음수" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Weight */}
            <ChartCard
              title="체중"
              unit="kg"
              latest={latestWt ? `${latestWt.weight_kg} kg` : '-'}
              latestTime={latestWt?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="weight" fill={C.primary} radius={[2, 2, 0, 0]} name="체중(kg)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* BMI */}
            <ChartCard
              title="BMI"
              unit=""
              latest={latestWt ? `${latestWt.bmi}` : '-'}
              latestTime={latestWt?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={25} stroke={C.warning} strokeDasharray="4 4" strokeWidth={1} />
                  <Bar dataKey="bmi" fill={C.secondary} radius={[2, 2, 0, 0]} name="BMI" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Skeletal muscle mass */}
            <ChartCard
              title="골격근량"
              unit="kg"
              latest={latestWt?.skeletal_muscle_mass != null ? `${latestWt.skeletal_muscle_mass} kg` : '-'}
              latestTime={latestWt?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="muscle" fill={C.safe} radius={[2, 2, 0, 0]} name="골격근량(kg)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Body fat percentage */}
            <ChartCard
              title="체지방률"
              unit="%"
              latest={latestWt?.body_fat_percentage != null ? `${latestWt.body_fat_percentage}%` : '-'}
              latestTime={latestWt?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="fat" fill={C.warning} radius={[2, 2, 0, 0]} name="체지방률(%)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        )}
      </div>
    </div>
  )
}

// ── ChartCard ────────────────────────────────────────────────────────────────

interface BadgeConfig { text: string; type: 'danger' | 'warning' }

interface ChartCardProps {
  title: string
  unit: string
  latest: string
  latestTime?: string
  badge?: BadgeConfig
  children: React.ReactNode
}

function ChartCard({ title, unit, latest, latestTime, badge, children }: ChartCardProps) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleRow}>
          <span className={styles.chartTitle}>{title}</span>
          {unit && <span className={styles.chartUnit}>{unit}</span>}
          {badge && (
            <span className={`${styles.badge} ${badge.type === 'danger' ? styles.badgeDanger : styles.badgeWarning}`}>
              {badge.text}
            </span>
          )}
        </div>
        <div className={styles.chartLatest}>
          <span className={styles.chartLatestValue}>{latest}</span>
          {latestTime && <span className={styles.chartLatestTime}>{formatTime(latestTime)}</span>}
        </div>
      </div>
      {children}
    </div>
  )
}
