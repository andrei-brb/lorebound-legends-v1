import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { hasError: true, message, stack };
  }

  componentDidCatch(error: unknown) {
    // Keep logging for environments where console is available.
    console.error("[UI] Uncaught render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 space-y-4">
          <h1 className="font-heading text-xl font-bold">Something crashed</h1>
          <p className="text-sm text-muted-foreground">
            Copy this error and send it to the developer so we can fix it.
          </p>
          <pre className="text-xs whitespace-pre-wrap break-words rounded-lg bg-secondary p-4 border border-border overflow-auto max-h-[50vh]">
            {this.state.message}
            {this.state.stack ? `\n\n${this.state.stack}` : ""}
          </pre>
          <a
            className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground font-heading font-bold text-sm"
            href="/"
          >
            Reload
          </a>
        </div>
      </div>
    );
  }
}

