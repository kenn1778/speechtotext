import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

const themeOverrides = `
.amplify-authenticator {
  --amplify-components-authenticator-router-border-width: 0;
  --amplify-components-tabs-item-active-border-color: #3b82f6;
  --amplify-components-tabs-item-color: #94a3b8;
  --amplify-components-tabs-item-active-color: #f1f5f9;
  --amplify-components-button-primary-background-color: #3b82f6;
  --amplify-components-button-primary-hover-background-color: #2563eb;
  --amplify-components-button-primary-color: #ffffff;
  --amplify-components-button-link-color: #60a5fa;
  --amplify-components-button-link-hover-color: #93c5fd;
  --amplify-components-field-input-background-color: rgba(0, 0, 0, 0.4);
  --amplify-components-field-input-border-color: rgba(255, 255, 255, 0.1);
  --amplify-components-field-input-color: #e2e8f0;
  --amplify-components-field-input-focus-border-color: rgba(255, 255, 255, 0.3);
  --amplify-components-field-label-color: #cbd5e1;
  --amplify-components-text-color: #e2e8f0;
  --amplify-components-heading-color: #ffffff;
  --amplify-colors-background-primary: #0a0a0f;
  --amplify-colors-background-secondary: #14141f;
  --amplify-colors-background-tertiary: #1a1a2e;
  --amplify-colors-border-primary: rgba(255, 255, 255, 0.1);
  --amplify-colors-border-secondary: rgba(255, 255, 255, 0.06);
  --amplify-colors-font-primary: #e2e8f0;
  --amplify-colors-font-secondary: #94a3b8;
  --amplify-colors-font-tertiary: #64748b;
  --amplify-components-authenticator-max-width: 420px;
}

.amplify-authenticator [data-amplify-router] {
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  overflow: hidden;
}

.amplify-tabs {
  background: transparent;
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.amplify-button[data-variation="primary"] {
  border-radius: 12px;
  font-weight: 600;
}

.amplify-button[data-variation="social"] {
  border-radius: 12px;
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.amplify-button[data-variation="social"]:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.amplify-field__show-password {
  color: #94a3b8;
}

.amplify-alert {
  border-radius: 12px;
}
`

const formFields = {
  signIn: {
    username: { placeholder: 'Enter your email', label: 'Email' },
    password: { placeholder: 'Enter your password', label: 'Password' },
  },
}

function LoginPage({ children }) {
  return (
    <>
      <style>{themeOverrides}</style>
      <Authenticator
        socialProviders={['google']}
        loginMechanisms={['email']}
        formFields={formFields}
        hideSignUp={false}
      >
        {children}
      </Authenticator>
    </>
  )
}

export default LoginPage
