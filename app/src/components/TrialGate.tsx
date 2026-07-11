import type { ReactNode } from 'react'
import {
  DEVELOPER_NAME,
  DEVELOPER_PHONE,
  DEVELOPER_PHONE_TEL,
  getTrialEnd,
  isTrialExpired,
  TRIAL_DAYS,
} from '../lib/trial'

interface TrialGateProps {
  children: ReactNode
}

export function TrialGate({ children }: TrialGateProps) {
  if (!isTrialExpired()) {
    return <>{children}</>
  }

  const endDate = getTrialEnd().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="login-shell">
      <div className="auth-card max-w-md p-0">
        <div className="auth-header">
          <p className="relative z-10 text-xs font-medium text-white/70">فترة تجريبية</p>
          <h1 className="font-display relative z-10 mt-2 text-xl font-bold sm:text-2xl">
            تم الانتهاء من الفترة التجريبية
          </h1>
        </div>

        <div className="space-y-4 p-6 text-center">
          <p className="text-sm leading-relaxed text-text-secondary">
            انتهت الفترة التجريبية ({TRIAL_DAYS} أيام) في {endDate}.
            <br />
            الرجاء التواصل مع المطور لإعادة تفعيل المنصة.
          </p>

          <div className="panel space-y-2 p-4">
            <p className="text-sm text-text-secondary">المطور</p>
            <p className="font-display text-lg font-bold text-primary-dark">{DEVELOPER_NAME}</p>
            <a
              href={`tel:${DEVELOPER_PHONE_TEL}`}
              className="inline-block font-mono text-lg font-semibold text-primary-dark underline decoration-primary/30 underline-offset-4"
              dir="ltr"
            >
              {DEVELOPER_PHONE}
            </a>
          </div>

          <a href={`tel:${DEVELOPER_PHONE_TEL}`} className="btn-primary w-full">
            اتصال بالمطور
          </a>
        </div>
      </div>
    </div>
  )
}
