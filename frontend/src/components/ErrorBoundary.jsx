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
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl text-stripe-navy font-medium mb-2">Something went wrong</h2>
            <p className="text-stripe-body text-sm mb-6">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
              className="btn-primary"
            >
              Go Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
