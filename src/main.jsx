import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import awsExports from './aws-exports.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

Amplify.configure(awsExports)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Authenticator>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Authenticator>
  </React.StrictMode>
)
