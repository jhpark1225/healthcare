import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendChat, type ChatMessage } from '../../api/chat'
import { useAuth } from '../../hooks/useAuth'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    const text = input
    setInput('')
    setSending(true)

    try {
      const reply = await sendChat({ message: text })
      setMessages(prev => [...prev, reply])
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: '응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button className={styles.navBack} onClick={() => void navigate(-1)}>← 뒤로</button>
        <span className={styles.navTitle}>AI 건강 상담</span>
        <button className={styles.navBtn} onClick={() => void logout()}>로그아웃</button>
      </nav>

      <main className={styles.main}>
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>AI 건강 상담</p>
              <p className={styles.emptyDesc}>
                환자 상태, 이상 감지, 진단 관련 질문을 입력하세요.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}
            >
              {msg.content}
            </div>
          ))}
          {sending && (
            <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.bubbleTyping}`}>
              ···
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className={styles.inputArea}>
          <input
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="메시지를 입력하세요"
            disabled={sending}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={sending || !input.trim()}
          >
            전송
          </button>
        </form>
      </main>
    </div>
  )
}
