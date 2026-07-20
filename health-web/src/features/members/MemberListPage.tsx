import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMemberList } from '../../api/members'
import type { Member } from '@shared/types'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, genderLabel, calcAge } from '@shared/utils'
import Sidebar from '../../components/Sidebar'
import styles from './MemberListPage.module.css'

type GenderFilter = 'ALL' | 'M' | 'F'

export default function MemberListPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const { member } = useAuth()
  const navigate = useNavigate()

  // PATI users skip this page and go directly to their own detail
  useEffect(() => {
    if (member?.member_type === 'PATI') {
      void navigate(`/members/${member.member_id}`, { replace: true })
    }
  }, [member, navigate])

  useEffect(() => {
    getMemberList()
      .then(data => setMembers(data.filter(m => m.member_type === 'PATI')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch =
        !debouncedSearch ||
        m.name.includes(debouncedSearch) ||
        m.member_id.includes(debouncedSearch)
      const matchGender =
        genderFilter === 'ALL' || m.gender === genderFilter
      return matchSearch && matchGender
    })
  }, [members, debouncedSearch, genderFilter])

  const GENDER_CHIPS: { key: GenderFilter; label: string }[] = [
    { key: 'ALL', label: '전체' },
    { key: 'M', label: '남' },
    { key: 'F', label: '여' },
  ]

  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>환자 목록</h1>

          <div className={styles.controls}>
            <input
              className={styles.search}
              type="search"
              placeholder="이름 또는 아이디 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className={styles.chipGroup}>
              {GENDER_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  className={`${styles.chip} ${genderFilter === chip.key ? styles.chipActive : ''}`}
                  onClick={() => setGenderFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className={styles.main}>
          {loading ? (
            <p className={styles.hint}>불러오는 중...</p>
          ) : (
            <>
              <p className={styles.count}>
                총 <strong>{filtered.length}</strong>명
              </p>
              <div className={styles.grid}>
                {filtered.map(m => (
                  <button
                    key={m.member_id}
                    className={styles.card}
                    onClick={() => void navigate(`/members/${m.member_id}`)}
                  >
                    <div className={styles.avatar}>
                      <span>{genderLabel(m.gender)}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <p className={styles.name}>{m.name}</p>
                      <p className={styles.meta}>
                        {m.birth_date ? `${calcAge(m.birth_date)}세` : '-'}
                        {' · '}
                        {m.gender === 'M' ? '남' : m.gender === 'F' ? '여' : '-'}
                      </p>
                      <p className={styles.sub}>{m.member_id}</p>
                      <p className={styles.date}>등록 {formatDate(m.created_at)}</p>
                    </div>
                    <span className={styles.chevron}>›</span>
                  </button>
                ))}

                {filtered.length === 0 && !loading && (
                  <p className={styles.empty}>검색 결과가 없습니다.</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
