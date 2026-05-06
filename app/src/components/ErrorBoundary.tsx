import { Component, type ReactNode } from "react";
import { Logo } from "./ui/Logo";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-6">
        <Logo variant="full" size={64} />
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold text-heading mt-4">Something went wrong</h2>
          <p className="text-sm text-subtle mt-2">
            We hit an unexpected error. Reload to try again — your in-progress
            notes are saved locally and should reappear.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-xs text-left bg-surface-2 rounded-[8px] p-3 overflow-auto max-h-48 text-body">
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-4 px-4 py-2 rounded-[8px] bg-brand text-white text-sm font-medium hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
