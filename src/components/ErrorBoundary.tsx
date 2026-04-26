import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  componentStack: string | null;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Keep the UI usable in production embeds (Discord) by surfacing the component stack.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    this.setState({ error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#070505] text-[#f3e3b5] p-6">
        <div className="panel-gold max-w-3xl mx-auto p-6">
          <div className="font-heading text-xl gold-text">Something went wrong</div>
          <div className="mt-2 text-sm text-[#d6c293]">
            A runtime error occurred. If you see this in Discord, please send a screenshot of this panel.
          </div>
          <pre className="mt-4 whitespace-pre-wrap text-[12px] leading-relaxed text-[#e9d8aa]/90">
            {String(this.state.error?.message || this.state.error)}
            {"\n\n"}
            {this.state.error?.stack ? this.state.error.stack : ""}
            {this.state.componentStack ? `\n\nComponent stack:\n${this.state.componentStack}` : ""}
          </pre>
        </div>
      </div>
    );
  }
}

