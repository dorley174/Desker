import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application error boundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
          <p className="text-muted-foreground">Интерфейс столкнулся с ошибкой. Обновите страницу или вернитесь на главную.</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Обновить страницу</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>На главную</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
