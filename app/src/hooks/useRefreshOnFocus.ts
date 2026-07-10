import { useEffect, useRef } from 'react'

/**
 * يعيد استدعاء الدالة عند:
 * - أول التحميل (اختياري عبر المُستدعي)
 * - عودة التركيز للنافذة
 * - ظهور التبويب بعد الإخفاء
 */
export function useRefreshOnFocus(refresh: () => void | Promise<void>, enabled = true) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return

    const run = () => {
      void refreshRef.current()
    }

    const onFocus = () => run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
