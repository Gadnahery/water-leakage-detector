import { useEffect, useRef } from 'react'

function beep(ctx, startAt, freq) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25)
  osc.connect(gain).connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + 0.3)
}

function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const now = ctx.currentTime
  ;[0, 0.35, 0.7].forEach((offset) => beep(ctx, now + offset, 880))
}

// Fires a sound + browser notification the moment status flips to ABNORMAL.
export function useLeakAlert(isAbnormal, detail) {
  const wasAbnormal = useRef(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (isAbnormal && !wasAbnormal.current) {
      try {
        playAlarm()
      } catch {
        // audio can fail before any user interaction unlocks the context; ignore
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Water Leakage Detected', {
          body: detail || 'Sensor readings diverged — check the system now.',
          tag: 'water-leak-alert',
        })
      }
    }
    wasAbnormal.current = isAbnormal
  }, [isAbnormal, detail])
}
