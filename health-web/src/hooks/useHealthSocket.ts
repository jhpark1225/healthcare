import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Cookies from 'js-cookie'
import { getHealthLatest } from '../api/members'
import type {
  HeartRate,
  BloodPressure,
  Glucose,
  Step,
  Weight,
  WsHeartRateEvent,
  WsBloodPressureEvent,
  WsGlucoseEvent,
  WsStepEvent,
  WsWeightEvent,
} from '@shared/types'

export interface HealthData {
  heartRates: HeartRate[]
  bloodPressures: BloodPressure[]
  glucoses: Glucose[]
  steps: Step[]
  weights: Weight[]
}

const MAX_POINTS = 20

export function useHealthSocket(memberId: string) {
  const [data, setData] = useState<HealthData>({
    heartRates: [],
    bloodPressures: [],
    glucoses: [],
    steps: [],
    weights: [],
  })
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!memberId) return
    let cancelled = false

    // Step 1: REST initial load (single API call)
    getHealthLatest(memberId, { limit: MAX_POINTS })
      .then(latest => {
        if (cancelled) return
        setData(prev => ({
          ...prev,
          heartRates: latest.heartRates,
          bloodPressures: latest.bloodPressures,
          glucoses: latest.glucoses,
          steps: latest.steps,
          weights: latest.weights,
        }))
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    // Step 2: WebSocket subscription (vitals only — alerts handled by AlertContext)
    const token = Cookies.get('access_token') ?? ''
    const socket = io(`${import.meta.env.VITE_WS_URL as string}/health-ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      if (!cancelled) setConnected(true)
      socket.emit('subscribe', { memberId })
    })
    socket.on('disconnect', () => { if (!cancelled) setConnected(false) })

    socket.on('heartRate', (d: WsHeartRateEvent) => {
      if (cancelled) return
      const row: HeartRate = {
        seq: 0, member_id: d.memberId, heart_rate: d.heart_rate,
        status: d.status, note: null,
        measured_at: d.measured_at, created_at: d.measured_at,
      }
      setData(prev => ({
        ...prev,
        heartRates: [row, ...prev.heartRates].slice(0, MAX_POINTS),
      }))
    })

    socket.on('bloodPressure', (d: WsBloodPressureEvent) => {
      if (cancelled) return
      const row: BloodPressure = {
        seq: 0, member_id: d.memberId, systolic: d.systolic, diastolic: d.diastolic,
        status: d.status, note: null,
        measured_at: d.measured_at, created_at: d.measured_at,
      }
      setData(prev => ({
        ...prev,
        bloodPressures: [row, ...prev.bloodPressures].slice(0, MAX_POINTS),
      }))
    })

    socket.on('glucose', (d: WsGlucoseEvent) => {
      if (cancelled) return
      const row: Glucose = {
        seq: 0, member_id: d.memberId, glucose_value: d.glucose_value,
        status: d.status, note: null,
        measured_at: d.measured_at, created_at: d.measured_at,
      }
      setData(prev => ({
        ...prev,
        glucoses: [row, ...prev.glucoses].slice(0, MAX_POINTS),
      }))
    })

    socket.on('stepCount', (d: WsStepEvent) => {
      if (cancelled) return
      const row: Step = {
        seq: 0, member_id: d.memberId,
        cumulative_steps: d.cumulative_steps,
        measured_at: d.measured_at, created_at: d.measured_at,
      }
      setData(prev => ({
        ...prev,
        steps: [row, ...prev.steps].slice(0, MAX_POINTS),
      }))
    })

    socket.on('weight', (d: WsWeightEvent) => {
      if (cancelled) return
      const row: Weight = {
        seq: 0, member_id: d.memberId,
        weight_kg: d.weight_kg, bmi: d.bmi,
        skeletal_muscle_mass: d.skeletal_muscle_mass,
        body_fat_percentage: d.body_fat_percentage,
        status: null, note: null,
        measured_at: d.measured_at, created_at: d.measured_at,
      }
      setData(prev => ({
        ...prev,
        weights: [row, ...prev.weights].slice(0, MAX_POINTS),
      }))
    })

    return () => {
      cancelled = true
      socket.emit('unsubscribe', { memberId })
      socket.disconnect()
    }
  }, [memberId])

  return { data, loading, connected }
}
