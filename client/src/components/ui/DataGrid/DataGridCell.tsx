import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface DataGridCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const alignmentClasses = {
  left: 'text-left justify-start',
  center: 'text-center justify-center',
  right: 'text-right justify-end',
};

export const DataGridCell = memo(function DataGridCell({
  children,
  align = 'left',
  className,
}: DataGridCellProps) {
  return (
    <div
      className={cn(
        'flex items-center px-3 py-2 min-w-0 overflow-hidden',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
});
