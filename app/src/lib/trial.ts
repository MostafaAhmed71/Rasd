/** إعدادات الفترة التجريبية للتطبيق */

export const TRIAL_DAYS = 3

/** بداية الفترة — غيّر هذا التاريخ عند بدء تجربة جديدة */
export const TRIAL_START_ISO =
  (import.meta.env.VITE_TRIAL_START as string | undefined) ?? '2026-07-12T00:00:00+03:00'

export const DEVELOPER_NAME = 'مصطفى أحمد'
export const DEVELOPER_PHONE = '0543641209'
export const DEVELOPER_PHONE_TEL = '0543641209'

export function getTrialStart(): Date {
  return new Date(TRIAL_START_ISO)
}

export function getTrialEnd(): Date {
  const start = getTrialStart()
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}

export function isTrialExpired(now = new Date()): boolean {
  return now.getTime() >= getTrialEnd().getTime()
}

export function getTrialRemainingMs(now = new Date()): number {
  return Math.max(0, getTrialEnd().getTime() - now.getTime())
}

export function getTrialRemainingDays(now = new Date()): number {
  const ms = getTrialRemainingMs(now)
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
