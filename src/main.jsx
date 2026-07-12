import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'
import awsconfig from './aws-exports'

if (awsconfig.oauth) {
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (isLocal) {
    awsconfig.oauth.redirectSignIn = 'http://localhost:5173/'
    awsconfig.oauth.redirectSignOut = 'http://localhost:5173/'
  } else {
    awsconfig.oauth.redirectSignIn = window.location.origin + '/'
    awsconfig.oauth.redirectSignOut = window.location.origin + '/'
  }
}

Amplify.configure(awsconfig)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
