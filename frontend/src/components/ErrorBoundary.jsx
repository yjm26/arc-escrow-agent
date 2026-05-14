import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-stripe-navy dark:text-white mb-2">Something went wrong</h2>
            <p className="text-stripe-body dark:text-gray-400 text-sm mb-2">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded p-3 mb-6 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-600 dark:text-red-400 font-mono break-all">{this.state.error?.stack?.split('\n').slice(0,3).join('\n')}</code>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Reload Page
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); if (this.props.onReset) this.props.onReset() }}
                className="btn-ghost"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
