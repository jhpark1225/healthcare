import { io, type Socket } from 'socket.io-client'

export function createHealthSocket(token: string): Socket {
  return io(`${import.meta.env.VITE_WS_URL as string}/health-ws`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
  })
}
