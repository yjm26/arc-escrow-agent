import { useEffect, useRef, useCallback } from 'react'

export function useSmartPolling(callback, deps, opts = {}) {
  const {
    interval = 10000,
    enabled = true,
    maxBackoff = 60000,
    onError,
  } = opts

  const cbRef = useRef(callback)
  cbRef.current = callback

  const backoffRef = useRef(0)
  const timerRef = useRef(null)
  const mountedRef = useRef(true)

  const run = useCallback(async () => {
    if (!mountedRef.current || !enabled || document.hidden) return
    try {
      await cbRef.current()
      backoffRef.current = 0 // reset on success
    } catch (err) {
      console.error('Poll error:', err)
      backoffRef.current = Math.min((backoffRef.current || interval) * 2, maxBackoff)
      if (onError) onError(err)
    }
  }, [enabled, interval, maxBackoff, onError])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) return

    // immediate first run
    run()

    const schedule = () => {
      const delay = backoffRef.current || interval
      timerRef.current = setTimeout(async () => {
        await run()
        if (mountedRef.current) schedule()
      }, delay)
    }
    schedule()

    // resume on visibility change
    const onVis = () => { if (!document.hidden) { clearTimeout(timerRef.current); schedule() } }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled, interval, run])

  // re-run when deps change
  useEffect(() => {
    if (!enabled) return
    clearTimeout(timerRef.current)
    backoffRef.current = 0
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
