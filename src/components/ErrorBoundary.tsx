import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return <div role="alert">문제가 발생했어요. 앱을 새로고침해 주세요.</div>;
    }
    return this.props.children;
  }
}
