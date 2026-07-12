import { useCallback, useEffect, useState } from 'react'
import { Hub } from 'aws-amplify/utils'
import UserDashboard from './components/UserDashboard.jsx'
import AccountPage from './components/AccountPage.jsx'
import LoginPage from './components/LoginPage.jsx'
import LandingPage from './components/LandingPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [page, setPage] = useState('account')

  const fetchUser = useCallback(async () => {
    try {
      const { getCurrentUser, fetchUserAttributes } = await import('aws-amplify/auth')
      const currentUser = await getCurrentUser()
      let attributes = {}
      try { attributes = await fetchUserAttributes() } catch {}
      setUser({ ...currentUser, attributes })
      return true
    } catch {
      setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let safetyTimer

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' && !cancelled) {
        fetchUser().finally(() => { if (!cancelled) setLoading(false) })
      }
      if (payload.event === 'signedOut' && !cancelled) {
        setUser(null)
        setLoading(false)
      }
    })

    ;(async () => {
      const hasOAuthCode = new URLSearchParams(window.location.search).has('code')
        || window.location.hash.includes('id_token')

      if (hasOAuthCode) {
        try {
          const { signInWithRedirect } = await import('aws-amplify/auth')
          await signInWithRedirect()
        } catch {}
      }

      await new Promise(r => { safetyTimer = setTimeout(r, 8000) })
      if (!cancelled) {
        const ok = await fetchUser()
        if (!ok && hasOAuthCode) {
          await new Promise(r => setTimeout(r, 5000))
          await fetchUser()
        }
        if (!cancelled) {
          if (hasOAuthCode && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
      clearTimeout(safetyTimer)
    }
  }, [fetchUser])

  const handleAuth = (authedUser) => {
    setUser(authedUser)
    setShowLogin(false)
  }

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('aws-amplify/auth')
      await signOut()
    } finally {
      setUser(null)
      setShowLogin(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Signing in...</p>
        </div>
      </div>
    )
  }

  if (!user && !showLogin) {
    return <LandingPage onSignIn={() => setShowLogin(true)} />
  }

  if (!user && showLogin) {
    return <LoginPage onAuth={handleAuth} />
  }

  if (page === 'account') {
    return (
      <ErrorBoundary>
        <AccountPage user={user} onSignOut={handleSignOut} onGoToDashboard={() => setPage('dashboard')} />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <UserDashboard user={user} onSignOut={handleSignOut} onGoToAccount={() => setPage('account')} />
    </ErrorBoundary>
  )
}

export default App
