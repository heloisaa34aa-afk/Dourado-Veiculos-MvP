import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onBackToDashboard?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Não foi possível carregar o módulo 360°
          </h2>
          <p className="text-gray-500 max-w-md mb-6">
            Ocorreu um erro inesperado ao tentar exibir esta interface.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <RefreshCw size={18} />
              Tentar novamente
            </button>
            {this.props.onBackToDashboard && (
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  this.props.onBackToDashboard?.();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <ArrowLeft size={18} />
                Voltar ao painel
              </button>
            )}
          </div>

          {import.meta.env.DEV && this.state.error && (
            <div className="mt-8 text-left max-w-2xl w-full bg-gray-50 rounded-lg p-4 overflow-auto text-xs font-mono text-gray-700 border border-gray-200">
              <p className="font-bold text-red-600 mb-2">{this.state.error.toString()}</p>
              <pre>{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
