import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  override render() {
    const { error } = this.state

    if (!error) return this.props.children

    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">This page stopped working</h1>
          <p className="mt-2 text-sm text-red-800">
            An error escaped the interface. Reloading should recover it.
          </p>
          <p className="mt-3 font-mono text-xs break-words text-red-700">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
