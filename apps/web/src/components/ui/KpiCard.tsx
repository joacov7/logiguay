import React from 'react';

interface TrendProps {
  value: number;
  label: string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: TrendProps;
  progress?: number;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  loading?: boolean;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  variant = 'default',
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="lg-skel" style={{ height: 120, borderRadius: 'var(--r)' }} />
    );
  }

  const accentColor = variant === 'danger' ? 'var(--red)' : variant === 'warning' ? 'var(--orange)' : variant === 'success' ? 'var(--green)' : 'var(--accent)';
  const accentSoft = variant === 'danger' ? 'var(--red-soft)' : variant === 'warning' ? 'var(--orange-soft)' : variant === 'success' ? 'var(--green-soft)' : 'var(--accent-soft)';
  const grad = variant === 'danger'
    ? 'linear-gradient(135deg, #E5484D, #cc3338)'
    : variant === 'warning'
    ? 'linear-gradient(135deg, #F2870D, #d9720a)'
    : variant === 'success'
    ? 'linear-gradient(135deg, #1FB877, #15A66A)'
    : 'var(--grad)';

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r)',
        boxShadow: 'var(--sh-sm)',
        padding: '18px 18px 14px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        cursor: 'default',
      }}
      className="kpi-card-hover"
    >
      {/* top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: grad,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{
          fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600,
          color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em',
          margin: 0,
        }}>
          {title}
        </p>
        {icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 9, background: accentSoft,
            color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
      </div>

      <p style={{
        fontFamily: 'var(--font-d)', fontSize: 30, fontWeight: 700, letterSpacing: '-.02em',
        color: 'var(--ink)', lineHeight: 1, margin: '0 0 8px',
      }}>
        {value}
      </p>

      {subtitle && (
        <p style={{ fontSize: 12.5, color: 'var(--faint)', margin: '0 0 6px' }}>{subtitle}</p>
      )}

      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 12.5, fontWeight: 600,
            padding: '2px 7px', borderRadius: 6,
            color: trend.value >= 0 ? 'var(--green)' : 'var(--red)',
            background: trend.value >= 0 ? 'var(--green-soft)' : 'var(--red-soft)',
          }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>{trend.label}</span>
        </div>
      )}

      {progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%', background: accentColor, borderRadius: 3,
              transition: 'width .5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
