import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'
import awsconfig from './aws-exports'

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
if (isLocal && awsconfig.oauth) {
  awsconfig.oauth.redirectSignIn = 'http://localhost:5173/'
  awsconfig.oauth.redirectSignOut = 'http://localhost:5173/'
}

Amplify.configure(awsconfig)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
