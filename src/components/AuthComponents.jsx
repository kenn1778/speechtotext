import { useState } from 'react'

export const formFields = {
  signIn: {
    email: {
      placeholder: 'you@example.com',
      label: 'Email',
      order: 1,
    },
    password: {
      placeholder: 'Enter your password',
      label: 'Password',
      order: 2,
    },
  },
  signUp: {
    email: {
      placeholder: 'you@example.com',
      label: 'Email',
      order: 1,
    },
    name: {
      placeholder: 'Your full name',
      label: 'Full Name',
      order: 2,
    },
    password: {
      placeholder: 'At least 8 characters',
      label: 'Password',
      order: 3,
    },
    confirm_password: {
      placeholder: 'Confirm your password',
      label: 'Confirm Password',
      order: 4,
    },
  },
}

function RememberMeField() {
  const [remember, setRemember] = useState(
    () => localStorage.getItem('speechweb_remember') === 'true'
  )

  return (
    <label
      htmlFor="auth-remember"
      className="auth-remember-label"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        padding: '8px 0',
        fontSize: 14,
      }}
    >
      <input
        id="auth-remember"
        type="checkbox"
        checked={remember}
        onChange={(e) => {
          const checked = e.target.checked
          setRemember(checked)
          localStorage.setItem('speechweb_remember', String(checked))
        }}
        style={{
          accentColor: '#f8fafc',
          width: 16,
          height: 16,
        }}
      />
      <span style={{ color: '#94a3b8' }}>Remember me</span>
    </label>
  )
}

function SignInHeader() {
  return (
    <div className="auth-custom-header">
      <h2 className="auth-custom-title">Welcome Back</h2>
      <p className="auth-custom-subtitle">Sign in to your SpeechWeb account</p>
    </div>
  )
}

function SignUpHeader() {
  return (
    <div className="auth-custom-header">
      <h2 className="auth-custom-title">Create Account</h2>
      <p className="auth-custom-subtitle">Set up your SpeechWeb profile</p>
    </div>
  )
}

export const AuthComponents = {
  SignIn: {
    Header: SignInHeader,
    Footer: RememberMeField,
  },
  SignUp: {
    Header: SignUpHeader,
  },
}
