import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ink">
          <div className="max-w-md text-center px-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-400 mb-6">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
