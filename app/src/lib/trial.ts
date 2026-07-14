/** إعدادات الفترة التجريبية للتطبيق */

/** بداية الفترة */
export const TRIAL_START_ISO =
  (import.meta.env.VITE_TRIAL_START as string | undefined) ?? '2026-07-12T00:00:00+03:00'

/** نهاية الفترة: الجمعة الساعة 12 صباحاً */
export const TRIAL_END_ISO =
  (import.meta.env.VITE_TRIAL_END as string | undefined) ?? '2026-07-17T00:00:00+03:00'

export const DEVELOPER_NAME = 'مصطفى أحمد'
export const DEVELOPER_PHONE = '0543641209'
export const DEVELOPER_PHONE_TEL = '0543641209'

export function getTrialStart(): Date {
  return new Date(TRIAL_START_ISO)
}

export function getTrialEnd(): Date {
  return new Date(TRIAL_END_ISO)
}

/** مدة التجربة بالأيام (مقربة لأعلى للعرض) */
export function getTrialDays(): number {
  const ms = getTrialEnd().getTime() - getTrialStart().getTime()
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

/** @deprecated استخدم getTrialDays() — يُبقى للتوافق */
export const TRIAL_DAYS = getTrialDays()

export function getTrialTotalMs(): number {
  return Math.max(1, getTrialEnd().getTime() - getTrialStart().getTime())
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

export function formatTrialEndShort(): string {
  return getTrialEnd().toLocaleString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
