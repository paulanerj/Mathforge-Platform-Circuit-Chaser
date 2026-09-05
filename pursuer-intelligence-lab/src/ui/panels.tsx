/**
 * Small shared pieces of the lab interface.
 *
 * Plain inline styles rather than a CSS framework: the archive has to run on
 * somebody else's machine after `npm install`, and every build dependency is
 * one more way that fails.
 */
import React from 'react';

export const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';

export const styles = {
  button: {
    background: '#16202e', color: '#dfe7ef', border: '1px solid #2c3d52',
    borderRadius: 4, padding: '5px 9px', font: `11px ${MONO}`, cursor: 'pointer',
  } as React.CSSProperties,
  primary: {
    background: '#1d3a52', color: '#dfe7ef', border: '1px solid #3f6a92',
    borderRadius: 4, padding: '5px 9px', font: `11px ${MONO}`, cursor: 'pointer',
  } as React.CSSProperties,
  card: {
    border: '1px solid #22314a', borderRadius: 6, padding: 10, background: '#0b1220',
    marginBottom: 8,
  } as React.CSSProperties,
  heading: {
    color: '#8fb6e0', letterSpacing: 1, fontSize: 10, marginBottom: 6,
    textTransform: 'uppercase',
  } as React.CSSProperties,
  textarea: {
    width: '100%', background: '#060b14', color: '#cfe0f0', border: '1px solid #22314a',
    borderRadius: 4, font: `11px ${MONO}`, padding: 8,
  } as React.CSSProperties,
};

export const Card: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> =
  ({ title, children, right }) => (
    <div style={styles.card}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <div style={styles.heading}>{title}</div>
        <div style={{ marginLeft: 'auto' }}>{right}</div>
      </div>
      {children}
    </div>
  );

export const Row: React.FC<{ label: string; children: React.ReactNode; title?: string }> =
  ({ label, children, title }) => (
    <div title={title} style={{ display: 'grid', gridTemplateColumns: '148px 1fr', gap: 8, alignItems: 'center', marginBottom: 3 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span>{children}</span>
    </div>
  );

export const Slider: React.FC<{
  value: number; min: number; max: number; step: number; unit?: string;
  onChange: (value: number) => void;
}> = ({ value, min, max, step, unit, onChange }) => (
  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(event) => onChange(Number(event.target.value))} style={{ flex: 1 }} />
    <span style={{ width: 92, textAlign: 'right', opacity: 0.85 }}>{value}{unit ?? ''}</span>
  </span>
);

/** A transient block of selectable text — the reliable copy route in a frame. */
export const Transfer: React.FC<{
  title: string; text: string; editable?: boolean;
  onLoad?: (text: string) => void; onClose: () => void;
}> = ({ title, text, editable, onLoad, onClose }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { if (!editable) ref.current?.select(); }, [editable]);
  return (
    <Card title={title}>
      <textarea data-testid="transfer" ref={ref} defaultValue={text} style={{ ...styles.textarea, minHeight: 150 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {editable && onLoad && (
          <button style={styles.button} onClick={() => onLoad(ref.current?.value ?? '')}>LOAD IT</button>
        )}
        <button style={styles.button} onClick={onClose}>DONE</button>
      </div>
    </Card>
  );
};
