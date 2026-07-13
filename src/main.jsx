import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { Hub } from 'aws-amplify/utils'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { Authenticator } from '@aws-amplify/ui-react'
import { defaultStorage, sessionStorage } from 'aws-amplify/utils'
import '@aws-amplify/ui-react/styles.css'
import awsExports from './aws-exports.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthComponents, formFields } from './components/AuthComponents'
import './index.css'

const rememberMe = localStorage.getItem('speechweb_remember') === 'true'

Amplify.configure({
  ...awsExports,
  Auth: {
    Cognito: {
      keyValueStorage: rememberMe ? defaultStorage : sessionStorage,
    },
  },
})

const API_BASE = import.meta.env.VITE_API_BASE || ''

Hub.listen('auth', async ({ payload }) => {
  if (payload.event !== 'signedIn') return
  try {
    const { userId } = await getCurrentUser()
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    const attrs = session.tokens?.idToken?.payload
    if (!token || !attrs?.email) return
    const check = await fetch(
      `${API_BASE}/api/user/${encodeURIComponent(userId)}/profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const existing = await check.json()
    if (existing.exists) return
    await fetch(
      `${API_BASE}/api/user/${encodeURIComponent(userId)}/profile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: attrs.name || userId.split('@')[0] || '',
          email: attrs.email || '',
          picture: attrs.picture || '',
        }),
      }
    )
  } catch {}
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Authenticator
      loginMechanisms={['email']}
      signUpAttributes={['email', 'name']}
      formFields={formFields}
      components={AuthComponents}
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Authenticator>
  </React.StrictMode>
)
