import type { ReactNode } from 'react';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusConfig {
  label: string;
  variant: StatusVariant;
  icon?: ReactNode;
}

interface StatusBadgeCellProps {
  status: string;
  statusMap: Record<string, StatusConfig>;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

/**
 * Reusable status badge cell for displaying status with color coding
 */
export function StatusBadgeCell({
  status,
  statusMap,
  size = 'sm',
  className = '',
}: StatusBadgeCellProps) {
  const config = statusMap[status] ?? { label: status, variant: 'default' };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${variantStyles[config.variant]} ${sizeStyles[size]} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/**
 * Common status configurations for loan pricing
 */
export const pricingStatusMap: Record<string, StatusConfig> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  LOCKED: { label: 'Locked', variant: 'info' },
  REJECTED: { label: 'Rejected', variant: 'error' },
};
