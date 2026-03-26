/** Shared inline styles for property panel sections. */

export const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#7d8590',
  marginBottom: 6,
  fontFamily: 'system-ui',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 5,
  color: '#e6edf3',
  fontSize: 14,
  fontFamily: 'var(--brand-font-family)',
  direction: 'rtl',
  boxSizing: 'border-box',
};

export function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 10px',
    borderRadius: 5,
    border: `1px solid ${active ? '#D32F2F' : '#30363d'}`,
    background: active ? 'rgba(211,47,47,0.15)' : '#161b22',
    color: active ? '#ef5350' : '#8b949e',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--brand-font-family)',
  };
}
