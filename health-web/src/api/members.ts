import type {
  Member,
  HeartRate,
  BloodPressure,
  Weight,
  Glucose,
  Step,
  HealthQueryParams,
  HealthLatestResponse,
} from '@shared/types'
import api from './axiosInstance'

export async function getMemberList(): Promise<Member[]> {
  const { data } = await api.get<Member[]>('/members')
  return data
}

export async function getMember(memberId: string): Promise<Member> {
  const { data } = await api.get<Member>(`/members/${memberId}`)
  return data
}

export async function getHealthLatest(
  memberId: string,
  params?: { limit?: number }
): Promise<HealthLatestResponse> {
  const { data } = await api.get<HealthLatestResponse>(
    `/members/${memberId}/health/latest`,
    { params }
  )
  return data
}

export async function getHeartRates(memberId: string, params?: HealthQueryParams): Promise<HeartRate[]> {
  const { data } = await api.get<HeartRate[]>(`/members/${memberId}/health/heart-rates`, { params })
  return data
}

export async function getBloodPressures(memberId: string, params?: HealthQueryParams): Promise<BloodPressure[]> {
  const { data } = await api.get<BloodPressure[]>(`/members/${memberId}/health/blood-pressures`, { params })
  return data
}

export async function getWeights(memberId: string, params?: HealthQueryParams): Promise<Weight[]> {
  const { data } = await api.get<Weight[]>(`/members/${memberId}/health/weights`, { params })
  return data
}

export async function getGlucose(memberId: string, params?: HealthQueryParams): Promise<Glucose[]> {
  const { data } = await api.get<Glucose[]>(`/members/${memberId}/health/glucose`, { params })
  return data
}

export async function getSteps(memberId: string, params?: HealthQueryParams): Promise<Step[]> {
  const { data } = await api.get<Step[]>(`/members/${memberId}/health/steps`, { params })
  return data
}
