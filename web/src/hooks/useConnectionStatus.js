import { useEffect, useState } from 'react'

// Firmware reports every 30s (SEND_INTERVAL_MS) — anything older than 2.5x
// that interval means the GSM link has likely dropped.
export const OFFLINE_THRESHOLD_MS = 75000

export function useConnectionStatus(lastSeenIso) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!lastSeenIso) {
    return { online: false, secondsAgo: null }
  }

  const secondsAgo = Math.max(0, Math.round((now - new Date(lastSeenIso).getTime()) / 1000))
  return { online: secondsAgo * 1000 < OFFLINE_THRESHOLD_MS, secondsAgo }
}
