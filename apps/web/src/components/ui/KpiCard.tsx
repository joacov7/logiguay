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

const variantClasses: Record<string, string> = {
  default: 'bg-white border border-gray-200',
  warning: 'bg-amber-50 border border-amber-200',
  danger: 'bg-red-50 border border-red-200',
  success: 'bg-green-50 border border-green-200',
};

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
      <div className="rounded-xl p-5 bg-white border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-5 shadow-sm ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
