import { Component, type ReactNode } from 'react'
import i18n from '../i18n'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4">
          <div className="text-center">
            <h1 className="text-lg font-bold mb-2">{i18n.t('common:error.somethingWrong')}</h1>
            <p className="text-text-secondary text-sm mb-4">{i18n.t('common:error.pageLoadError')}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm hover:opacity-90"
            >
              {i18n.t('common:error.refreshPage')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
