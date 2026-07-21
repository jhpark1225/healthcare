import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line,
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import { useHealthSocket } from '../../hooks/useHealthSocket'
import { getMember, getHealthRange } from '../../api/members'
import { useAlerts } from '../../context/AlertContext'
import type { Member, HealthRangeResponse } from '@shared/types'
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

type RangeTab = '오늘' | '7일' | '30일'

function computeRange(tab: RangeTab): { from: string; to: string } {
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(Date.now() + kstOffset)
  // KST midnight in UTC
  const todayStartUtc = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - kstOffset
  )
  const days = tab === '오늘' ? 0 : tab === '7일' ? 6 : 29
  const fromUtc = new Date(todayStartUtc.getTime() - days * 86400000)
  const toUtc   = new Date(todayStartUtc.getTime() + 86400000 - 1)

  const toKST = (d: Date): string => {
    const kd = new Date(d.getTime() + kstOffset)
    const Y = kd.getUTCFullYear()
    const M = String(kd.getUTCMonth() + 1).padStart(2, '0')
    const D = String(kd.getUTCDate()).padStart(2, '0')
    const h = String(kd.getUTCHours()).padStart(2, '0')
    const m = String(kd.getUTCMinutes()).padStart(2, '0')
    const s = String(kd.getUTCSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D}T${h}:${m}:${s}+09:00`
  }

  return { from: toKST(fromUtc), to: toKST(toUtc) }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()
  const { data, connected } = useHealthSocket(memberId ?? '')
  const { addAlert } = useAlerts()
  const [memberInfo, setMemberInfo] = useState<Member | null>(null)

  // Range tab state
  const [rangeTab, setRangeTab] = useState<RangeTab>('오늘')
  const [rangeData, setRangeData] = useState<HealthRangeResponse | null>(null)
  const [rangeLoading, setRangeLoading] = useState(true)

  // Forward WS alerts to global AlertContext
  const alertCountRef = useRef(0)
  useEffect(() => {
    if (data.alerts.length > alertCountRef.current) {
      const newAlerts = data.alerts.slice(0, data.alerts.length - alertCountRef.current)
      newAlerts.forEach(a => addAlert(a, memberInfo?.name))
      alertCountRef.current = data.alerts.length
    }
  }, [data.alerts.length, addAlert, memberInfo?.name])

  // Fetch member info
  useEffect(() => {
    if (!memberId) return
    getMember(memberId).then(setMemberInfo).catch(() => {})
  }, [memberId])

  // Fetch range data on tab change or memberId change
  useEffect(() => {
    if (!memberId) return
    setRangeLoading(true)
    const { from, to } = computeRange(rangeTab)
    getHealthRange(memberId, from, to)
      .then(res => setRangeData(res))
      .catch(() => setRangeData(null))
      .finally(() => setRangeLoading(false))
  }, [memberId, rangeTab])

  if (!memberId) {
    void navigate('/members')
    return null
  }

  // Range API returns ASC order (oldest first) — use directly for charts
  const hr   = rangeData?.heartRates ?? []
  const bp   = rangeData?.bloodPressures ?? []
  const glu  = rangeData?.glucoses ?? []
  const wt   = rangeData?.weights ?? []
  const stp  = rangeData?.steps ?? []

  const hrData = hr.map(r => ({
    time: formatTime(r.measured_at),
    bpm: r.heart_rate,
  }))
  const bpData = bp.map(r => ({
    time: formatTime(r.measured_at),
    systolic: r.systolic,
    diastolic: r.diastolic,
  }))
  const glucoseData = glu.map(r => ({
    time: formatTime(r.measured_at),
    glucose: r.glucose_value,
    status: r.status,
  }))
  const weightData = wt.map(r => ({
    time: formatTime(r.measured_at),
    weight: r.weight_kg,
    bmi: r.bmi,
    muscle: r.skeletal_muscle_mass ?? 0,
    fat: r.body_fat_percentage ?? 0,
  }))

  // Latest values: last element (ASC → last = most recent)
  const latestHr   = hr.at(-1)
  const latestBp   = bp.at(-1)
  const latestGlu  = glu.at(-1)
  const latestWt   = wt.at(-1)
  const latestStep = stp.at(-1)

  const hrAbnormal  = !!latestHr && latestHr.heart_rate >= 100
  const bpAbnormal  = !!latestBp && (latestBp.systolic >= 140 || latestBp.diastolic >= 90)
  const gluStatus   = latestGlu?.status ?? null

  const TABS: RangeTab[] = ['오늘', '7일', '30일']

  return (
    <div className={styles.layout}>
      <Sidebar currentPatientName={memberInfo?.name ?? memberId} />

      <div className={styles.content}>

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

        {/* Range tab group */}
        <div className={styles.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${rangeTab === tab ? styles.tabBtnActive : ''}`}
              onClick={() => setRangeTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {rangeLoading ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonLine} style={{ width: '40%', height: 18, marginBottom: 12 }} />
                <div className={styles.skeletonLine} style={{ width: '100%', height: 150 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.chartGrid}>

            {/* Heart Rate */}
            <ChartCard
              title="심박수" unit="bpm"
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
              title="혈압" unit="mmHg"
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
              title="혈당" unit="mg/dL"
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
              title="걸음수" unit="걸음"
              latest={latestStep ? `${latestStep.cumulative_steps.toLocaleString()} 걸음` : '-'}
              latestTime={latestStep?.measured_at}
            >
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={stp.map(r => ({ time: formatTime(r.measured_at), steps: r.cumulative_steps }))}
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
              title="체중" unit="kg"
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
              title="BMI" unit=""
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
              title="골격근량" unit="kg"
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

            {/* Body fat */}
            <ChartCard
              title="체지방률" unit="%"
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
