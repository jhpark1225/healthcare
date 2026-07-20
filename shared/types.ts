// ── Members ──────────────────────────────────────────────────────────────────

export interface MemberDiseaseItem {
  diagnosis_seq: number
  disease_id: string
  disease_name_kr: string
  disease_name_en: string
  disease_category: string | null
  severity: string | null
  diagnosis_content: string | null
  diagnosed_at: string
}

export interface Member {
  member_id: string
  name: string
  gender: 'M' | 'F' | null
  birth_date: string | null
  member_type: 'PATI' | 'DOCT' | string
  created_at: string
  updated_at: string | null
  diseases?: MemberDiseaseItem[]
}

// ── Health Data ───────────────────────────────────────────────────────────────

export interface HeartRate {
  seq: number
  member_id: string
  heart_rate: number
  status: string | null
  note: string | null
  measured_at: string
  created_at: string
}

export interface BloodPressure {
  seq: number
  member_id: string
  systolic: number
  diastolic: number
  status: string | null
  note: string | null
  measured_at: string
  created_at: string
}

export interface Weight {
  seq: number
  member_id: string
  weight_kg: number
  bmi: number
  skeletal_muscle_mass: number | null
  body_fat_percentage: number | null
  status: string | null
  note: string | null
  measured_at: string
  created_at: string
}

export interface Glucose {
  seq: number
  member_id: string
  glucose_value: number
  status: string | null
  note: string | null
  measured_at: string
  created_at: string
}

export interface Step {
  seq: number
  member_id: string
  cumulative_steps: number
  measured_at: string
  created_at: string
}

export interface HealthLatestResponse {
  member_id: string
  fetched_at: string
  heartRates: HeartRate[]
  bloodPressures: BloodPressure[]
  glucoses: Glucose[]
  steps: Step[]
  weights: Weight[]
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  member_id: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  member: Member
}

export interface RefreshResponse {
  access_token: string
}

// ── Disease ───────────────────────────────────────────────────────────────────

export interface DiseaseCode {
  disease_id: string
  disease_name_en: string
  disease_name_kr: string
  disease_category: string | null
  severity: string | null
  description: string | null
}

export interface MemberDisease {
  diagnosis_seq: number
  member_id: string
  disease_id: string
  diagnosis_content: string | null
  diagnosed_at: string
  updated_at: string | null
  disease?: DiseaseCode
}

// ── Query Params ──────────────────────────────────────────────────────────────

export interface HealthQueryParams {
  from?: string
  to?: string
  limit?: number
}

// ── WebSocket Events ──────────────────────────────────────────────────────────

export interface WsHeartRateEvent {
  memberId: string
  heart_rate: number
  status: string | null
  source?: string
  measured_at: string
}

export interface WsBloodPressureEvent {
  memberId: string
  systolic: number
  diastolic: number
  status: string | null
  measured_at: string
}

export interface WsGlucoseEvent {
  memberId: string
  glucose_value: number
  status: string | null
  measured_at: string
}

export interface WsStepEvent {
  memberId: string
  cumulative_steps: number
  measured_at: string
}

export interface WsWeightEvent {
  memberId: string
  weight_kg: number
  bmi: number
  skeletal_muscle_mass: number | null
  body_fat_percentage: number | null
  measured_at: string
}

export interface WsAlertEvent {
  memberId: string
  type: string
  value: number
  message: string
  measured_at: string
}
