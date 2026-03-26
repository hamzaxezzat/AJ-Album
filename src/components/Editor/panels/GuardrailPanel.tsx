'use client';
import { useMemo } from 'react';
import type { Slide, Album, ChannelProfile, GuardrailIssue } from '@/types/album';
import { GuardrailEngine } from '@/lib/guardrails';

interface GuardrailPanelProps {
  slide: Slide;
  album: Album;
  channelProfile: ChannelProfile;
}

const SEVERITY_LABEL: Record<string, string> = {
  hard_stop: 'حرج',
  warning: 'تحذير',
  info: 'ملاحظة',
};

const SEVERITY_COLOR: Record<string, string> = {
  hard_stop: '#F44336',
  warning: '#FFA726',
  info: '#42A5F5',
};

const SEVERITY_BG: Record<string, string> = {
  hard_stop: 'rgba(244,67,54,0.1)',
  warning: 'rgba(255,167,38,0.08)',
  info: 'rgba(66,165,245,0.08)',
};

export function GuardrailPanel({ slide, album, channelProfile }: GuardrailPanelProps) {
  const engine = useMemo(() => new GuardrailEngine(), []);

  const result = useMemo(
    () => engine.evaluateSlide(slide, album, channelProfile),
    [engine, slide, album, channelProfile],
  );

  if (result.issues.length === 0) {
    return (
      <div style={{
        padding: '10px 12px',
        background: 'rgba(76,175,80,0.08)',
        borderRadius: 6,
        border: '1px solid rgba(76,175,80,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ color: '#4CAF50', fontSize: 16 }}>&#10003;</span>
        <span style={{ fontSize: 11, color: '#7d8590', fontFamily: 'var(--brand-font-family)' }}>
          لا توجد مشاكل في هذه الشريحة
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          fontSize: 11, color: '#7d8590',
          fontFamily: 'system-ui', textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          فحص الجودة
        </span>
        {result.hasHardStops && (
          <span style={{
            fontSize: 9, background: '#F44336', color: '#fff',
            padding: '1px 6px', borderRadius: 8, fontWeight: 700,
          }}>
            {result.issues.filter(i => i.severity === 'hard_stop').length} حرج
          </span>
        )}
        {result.warningCount > 0 && (
          <span style={{
            fontSize: 9, background: '#FFA726', color: '#fff',
            padding: '1px 6px', borderRadius: 8, fontWeight: 700,
          }}>
            {result.warningCount} تحذير
          </span>
        )}
      </div>
      {result.issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: GuardrailIssue }) {
  const color = SEVERITY_COLOR[issue.severity] ?? '#42A5F5';
  const bg = SEVERITY_BG[issue.severity] ?? 'rgba(66,165,245,0.08)';
  const label = SEVERITY_LABEL[issue.severity] ?? '';

  return (
    <div style={{
      padding: '8px 10px',
      background: bg,
      borderRadius: 6,
      borderInlineStart: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color,
          textTransform: 'uppercase', fontFamily: 'system-ui',
          letterSpacing: '0.03em',
        }}>
          {label}
        </span>
      </div>
      <p style={{
        fontSize: 11, color: '#c9d1d9', margin: 0,
        fontFamily: 'var(--brand-font-family)', lineHeight: 1.5,
      }}>
        {issue.message}
      </p>
      {issue.autoFixAvailable && issue.autoFixDescription && (
        <div style={{ marginTop: 4 }}>
          <span style={{
            fontSize: 9, color: '#58a6ff',
            fontFamily: 'var(--brand-font-family)',
          }}>
            &#9889; {issue.autoFixDescription}
          </span>
        </div>
      )}
    </div>
  );
}
