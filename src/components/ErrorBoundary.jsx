import { Component } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-display font-light text-text-primary mb-3">
            Something went wrong
          </h1>
          <p className="text-sm text-text-secondary/70 max-w-md leading-relaxed mb-8">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-text-primary text-base font-medium transition-all duration-200 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-accent-glow"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-1 border border-border text-text-secondary text-sm hover:bg-surface-2 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent-glow"
            >
              Refresh Page
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 w-full max-w-md">
              <summary className="text-xs text-text-secondary/40 cursor-pointer hover:text-text-secondary/60">
                Error details
              </summary>
              <pre className="mt-2 text-xs text-red-400/60 bg-surface-1 p-4 rounded-lg overflow-auto text-left">
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
