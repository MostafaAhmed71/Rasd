import { useEffect, useState } from 'react'
import {
  getTrialEnd,
  getTrialRemainingMs,
  isTrialExpired,
  TRIAL_DAYS,
} from '../lib/trial'

export interface TrialCountdownParts {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function getTrialCountdownParts(now = new Date()): TrialCountdownParts {
  const totalMs = getTrialRemainingMs(now)
  const expired = isTrialExpired(now) || totalMs <= 0
  const totalSeconds = Math.floor(totalMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { totalMs, days, hours, minutes, seconds, expired }
}

export function useTrialCountdown(tickMs = 1000): TrialCountdownParts {
  const [parts, setParts] = useState(() => getTrialCountdownParts())

  useEffect(() => {
    setParts(getTrialCountdownParts())
    const id = window.setInterval(() => {
      setParts(getTrialCountdownParts())
    }, tickMs)
    return () => window.clearInterval(id)
  }, [tickMs])

  return parts
}

export function formatTrialEndLabel(): string {
  return getTrialEnd().toLocaleString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export { TRIAL_DAYS }
