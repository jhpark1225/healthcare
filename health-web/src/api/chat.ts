import api from './axiosInstance'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  memberId?: string
}

export async function sendChat(req: ChatRequest): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>('/chat', req)
  return data
}
