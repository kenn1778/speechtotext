import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_LIMIT = 50 * 60 * 1000
const CHECK_INTERVAL = 60 * 1000
const LS_KEY = 'speechweb_lastActiveAt'

function getLastActive() {
  try {
    const val = localStorage.getItem(LS_KEY)
    return val ? Number(val) : null
  } catch {
    return null
  }
}

function setLastActive(now) {
  try {
    localStorage.setItem(LS_KEY, String(now))
  } catch {}
}

export default function useInactivityTimeout(onSignOut) {
  const timerRef = useRef(null)
  const isTimedOutRef = useRef(false)

  const touch = useCallback(() => {
    if (isTimedOutRef.current) return
    setLastActive(Date.now())
  }, [])

  useEffect(() => {
    const now = Date.now()
    const last = getLastActive()

    if (last && now - last >= INACTIVITY_LIMIT) {
      isTimedOutRef.current = true
      onSignOut()
      return
    }

    setLastActive(now)

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'focus']
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }))

    timerRef.current = setInterval(() => {
      const t = getLastActive()
      if (t && Date.now() - t >= INACTIVITY_LIMIT) {
        isTimedOutRef.current = true
        clearInterval(timerRef.current)
        onSignOut()
      }
    }, CHECK_INTERVAL)

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch))
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [onSignOut, touch])
}
