import { Component, type ReactNode } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-8">
      <p className="text-lg font-medium text-foreground mb-1">{t("error.title")}</p>
      <Button size="lg" className="mt-4" onClick={onRetry}>
        {t("error.retry")}
      </Button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("LedgerTable error:", error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
