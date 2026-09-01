import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /**
   * 값이 바뀌면 에러 상태를 해제하고 children을 다시 렌더한다.
   * App은 여기에 현재 경로를 넘긴다 — 한 화면이 터져도 탭으로 다른 화면에 가면 복구된다.
   */
  resetKey?: unknown;
  /** 기본 에러 뷰 대신 쓸 화면(선택). */
  fallback?: ReactNode;
};

type ErrorBoundaryState = { hasError: boolean };

/**
 * 루트 에러 경계 — 하위 화면이 throw해도 트리 전체가 언마운트되지 않게 막는다.
 *
 * React는 잡히지 않은 렌더 예외를 만나면 루트를 통째로 비운다 → 흰 화면(콘솔 에러만 남고
 * 원인 화면은 알 수 없음). 이 경계가 있으면 대신 식별 가능한 에러 뷰가 페인트되고,
 * 스모크도 타임아웃이 아니라 "에러 화면"이라는 읽을 수 있는 실패로 바뀐다.
 *
 * 뷰를 TDS가 아닌 기본 DOM + var(--adaptive*)로 그리는 건 의도적이다 — 터진 원인이
 * TDS 렌더 자체일 수 있고, 그때 폴백까지 TDS를 쓰면 폴백이 다시 터져 흰 화면으로 돌아간다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // 토스 검수는 console.error 0개를 요구한다 → 로깅 없이 조용히 폴백 화면으로 degrade.
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private retry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div
        role="alert"
        data-testid="error-boundary-view"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          minHeight: "60dvh",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--adaptiveGrey800)",
          backgroundColor: "var(--adaptiveBackground)",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 700 }}>화면을 그리지 못했어요</span>
        <span style={{ fontSize: 14, color: "var(--adaptiveGrey600)" }}>
          입력한 값은 그대로 있어요. 다시 시도를 눌러 주세요.
        </span>
        <button
          type="button"
          onClick={this.retry}
          style={{
            marginTop: 8,
            minHeight: 44,
            padding: "0 20px",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--adaptiveBlue500)",
            backgroundColor: "var(--adaptiveGrey100)",
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }
}
