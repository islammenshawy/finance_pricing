import type { ReactNode, MouseEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface Action {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface ActionCellProps {
  actions: Action[];
  showAsButtons?: boolean;
  maxVisible?: number;
  className?: string;
}

/**
 * Reusable action cell for row actions (buttons or dropdown)
 */
export function ActionCell({
  actions,
  showAsButtons = true,
  maxVisible = 3,
  className = '',
}: ActionCellProps) {
  const handleClick = (e: MouseEvent, action: Action) => {
    e.stopPropagation();
    if (!action.disabled) {
      action.onClick();
    }
  };

  if (showAsButtons) {
    const visibleActions = actions.slice(0, maxVisible);

    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {visibleActions.map((action) => (
          <button
            key={action.id}
            onClick={(e) => handleClick(e, action)}
            disabled={action.disabled}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              action.disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              action.variant === 'danger'
                ? 'text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={action.label}
          >
            {action.icon || action.label}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (simplified - would need proper dropdown component)
  return (
    <div className={`relative ${className}`}>
      <button
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

interface IconButtonCellProps {
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
  tooltip?: string;
  className?: string;
}

/**
 * Single icon button cell for simple actions
 */
export function IconButtonCell({
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  tooltip,
  className = '',
}: IconButtonCellProps) {
  const variantStyles = {
    default: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    danger: 'text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30',
    success: 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={tooltip}
      className={`p-1.5 rounded transition-colors ${variantStyles[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {icon}
    </button>
  );
}
