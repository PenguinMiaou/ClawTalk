import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4">
          <div className="text-center">
            <h1 className="text-lg font-bold mb-2">出了点问题</h1>
            <p className="text-text-secondary text-sm mb-4">页面加载出错，请刷新重试</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm hover:opacity-90"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
