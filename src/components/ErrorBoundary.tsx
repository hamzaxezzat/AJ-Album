'use client';
import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0D1117', color: '#e6edf3', fontFamily: 'system-ui',
          flexDirection: 'column', gap: 16, padding: 40, direction: 'rtl',
        }}>
          <h2 style={{ fontSize: 20, color: '#ef5350' }}>حدث خطأ غير متوقع</h2>
          <p style={{ fontSize: 14, color: '#8b949e', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'خطأ في عرض الصفحة'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#D32F2F', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--brand-font-family)',
            }}
          >
            إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
