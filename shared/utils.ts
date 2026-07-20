export function formatDate(date: string | Date, locale = 'ko-KR'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: string | Date, locale = 'ko-KR'): string {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatTime(date: string | Date, locale = 'ko-KR'): string {
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(
    `${birthDate.slice(0, 4)}-${birthDate.slice(4, 6)}-${birthDate.slice(6, 8)}`
  )
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function genderLabel(gender: string | null): string {
  if (gender === 'M') return '남'
  if (gender === 'F') return '여'
  return '-'
}
