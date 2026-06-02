import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'
import awsconfig from './aws-exports'

Amplify.configure(awsconfig)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
