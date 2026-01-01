/**
 * @fileoverview Grid Context Menu
 *
 * Provides right-click context menu functionality for grid rows and cells.
 * Features:
 * - Row-level actions
 * - Cell-level actions
 * - Custom menu items
 * - Keyboard navigation
 * - Nested submenus
 *
 * @module grid/features/ContextMenu
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Copy,
  Clipboard,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Filter,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export type ContextMenuItemType = 'action' | 'separator' | 'submenu' | 'checkbox';

export interface ContextMenuItem<TRow = unknown> {
  /** Unique identifier */
  id: string;

  /** Display label */
  label?: string;

  /** Item type */
  type?: ContextMenuItemType;

  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;

  /** Click handler */
  onClick?: (context: ContextMenuContext<TRow>) => void;

  /** Whether item is disabled */
  disabled?: boolean | ((context: ContextMenuContext<TRow>) => boolean);

  /** Whether item is visible */
  visible?: boolean | ((context: ContextMenuContext<TRow>) => boolean);

  /** Keyboard shortcut hint */
  shortcut?: string;

  /** For checkbox type - checked state */
  checked?: boolean | ((context: ContextMenuContext<TRow>) => boolean);

  /** For submenu type - child items */
  children?: ContextMenuItem<TRow>[];

  /** Danger styling */
  danger?: boolean;
}

export interface ContextMenuContext<TRow = unknown> {
  /** The row data */
  row?: TRow;

  /** Row index */
  rowIndex?: number;

  /** Column definition */
  column?: ColumnDef<TRow>;

  /** Cell value */
  cellValue?: unknown;

  /** Selected rows */
  selectedRows?: TRow[];

  /** Mouse position */
  position: { x: number; y: number };
}

export interface UseContextMenuOptions<TRow> {
  /** Menu items */
  items: ContextMenuItem<TRow>[];

  /** Called when menu opens */
  onOpen?: (context: ContextMenuContext<TRow>) => void;

  /** Called when menu closes */
  onClose?: () => void;

  /** Disable context menu */
  disabled?: boolean;
}

export interface UseContextMenuReturn<TRow> {
  /** Whether menu is open */
  isOpen: boolean;

  /** Current context */
  context: ContextMenuContext<TRow> | null;

  /** Open menu at position */
  openMenu: (context: ContextMenuContext<TRow>) => void;

  /** Close menu */
  closeMenu: () => void;

  /** Handle context menu event */
  handleContextMenu: (
    e: React.MouseEvent,
    row?: TRow,
    rowIndex?: number,
    column?: ColumnDef<TRow>,
    cellValue?: unknown
  ) => void;

  /** Menu props for rendering */
  menuProps: {
    isOpen: boolean;
    position: { x: number; y: number } | null;
    items: ContextMenuItem<TRow>[];
    context: ContextMenuContext<TRow> | null;
    onClose: () => void;
  };
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing context menu state
 */
export function useContextMenu<TRow>({
  items,
  onOpen,
  onClose,
  disabled = false,
}: UseContextMenuOptions<TRow>): UseContextMenuReturn<TRow> {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ContextMenuContext<TRow> | null>(null);

  const openMenu = useCallback((ctx: ContextMenuContext<TRow>) => {
    if (disabled) return;
    setContext(ctx);
    setIsOpen(true);
    onOpen?.(ctx);
  }, [disabled, onOpen]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setContext(null);
    onClose?.();
  }, [onClose]);

  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    row?: TRow,
    rowIndex?: number,
    column?: ColumnDef<TRow>,
    cellValue?: unknown
  ) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    openMenu({
      row,
      rowIndex,
      column,
      cellValue,
      position: { x: e.clientX, y: e.clientY },
    });
  }, [disabled, openMenu]);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = () => closeMenu();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  return {
    isOpen,
    context,
    openMenu,
    closeMenu,
    handleContextMenu,
    menuProps: {
      isOpen,
      position: context?.position ?? null,
      items,
      context,
      onClose: closeMenu,
    },
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

interface ContextMenuProps<TRow> {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  items: ContextMenuItem<TRow>[];
  context: ContextMenuContext<TRow> | null;
  onClose: () => void;
}

/**
 * Context menu dropdown component
 */
export function ContextMenu<TRow>({
  isOpen,
  position,
  items,
  context,
  onClose,
}: ContextMenuProps<TRow>) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !position || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8;
    }

    // Adjust vertical position
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8;
    }

    setAdjustedPosition({ x: Math.max(8, x), y: Math.max(8, y) });
  }, [isOpen, position]);

  if (!isOpen || !position || !context) return null;

  // Filter visible items
  const visibleItems = items.filter((item) => {
    if (item.visible === undefined) return true;
    return typeof item.visible === 'function'
      ? item.visible(context)
      : item.visible;
  });

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-md border bg-popover shadow-md',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
      )}
      style={{
        left: adjustedPosition?.x ?? position.x,
        top: adjustedPosition?.y ?? position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1">
        {visibleItems.map((item, index) => (
          <ContextMenuItemComponent
            key={item.id}
            item={item}
            context={context}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

interface ContextMenuItemComponentProps<TRow> {
  item: ContextMenuItem<TRow>;
  context: ContextMenuContext<TRow>;
  onClose: () => void;
}

function ContextMenuItemComponent<TRow>({
  item,
  context,
  onClose,
}: ContextMenuItemComponentProps<TRow>) {
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Handle separator
  if (item.type === 'separator') {
    return <div className="my-1 h-px bg-border" />;
  }

  // Check if disabled
  const isDisabled = typeof item.disabled === 'function'
    ? item.disabled(context)
    : item.disabled;

  // Check if checked (for checkbox type)
  const isChecked = item.type === 'checkbox'
    ? typeof item.checked === 'function'
      ? item.checked(context)
      : item.checked
    : false;

  // Handle click
  const handleClick = () => {
    if (isDisabled) return;

    if (item.type === 'submenu') {
      setSubmenuOpen(!submenuOpen);
      return;
    }

    item.onClick?.(context);
    onClose();
  };

  const Icon = item.icon;

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
          'transition-colors hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          isDisabled && 'pointer-events-none opacity-50',
          item.danger && 'text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950'
        )}
        onClick={handleClick}
        disabled={isDisabled}
        onMouseEnter={() => item.type === 'submenu' && setSubmenuOpen(true)}
        onMouseLeave={() => item.type === 'submenu' && setSubmenuOpen(false)}
      >
        {/* Checkbox indicator */}
        {item.type === 'checkbox' && (
          <span className="mr-2 h-4 w-4 flex items-center justify-center">
            {isChecked && <Check className="h-3 w-3" />}
          </span>
        )}

        {/* Icon */}
        {Icon && <Icon className="mr-2 h-4 w-4" />}

        {/* Label */}
        <span className="flex-1 text-left">{item.label}</span>

        {/* Shortcut */}
        {item.shortcut && (
          <span className="ml-auto pl-4 text-xs text-muted-foreground">
            {item.shortcut}
          </span>
        )}

        {/* Submenu indicator */}
        {item.type === 'submenu' && (
          <ChevronRight className="ml-2 h-4 w-4" />
        )}
      </button>

      {/* Submenu */}
      {item.type === 'submenu' && submenuOpen && item.children && (
        <div
          className={cn(
            'absolute left-full top-0 z-50 min-w-[160px] rounded-md border bg-popover shadow-md ml-1',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          <div className="p-1">
            {item.children.map((child) => (
              <ContextMenuItemComponent
                key={child.id}
                item={child}
                context={context}
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DEFAULT MENU ITEMS
// =============================================================================

/**
 * Create default row context menu items
 */
export function createRowContextMenuItems<TRow>(options?: {
  onCopy?: (row: TRow) => void;
  onEdit?: (row: TRow) => void;
  onDelete?: (row: TRow) => void;
  onView?: (row: TRow) => void;
  customItems?: ContextMenuItem<TRow>[];
}): ContextMenuItem<TRow>[] {
  const items: ContextMenuItem<TRow>[] = [];

  if (options?.onView) {
    items.push({
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (ctx) => ctx.row && options.onView?.(ctx.row),
    });
  }

  if (options?.onEdit) {
    items.push({
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      shortcut: 'E',
      onClick: (ctx) => ctx.row && options.onEdit?.(ctx.row),
    });
  }

  if (options?.onCopy) {
    items.push({
      id: 'copy',
      label: 'Copy',
      icon: Copy,
      shortcut: '⌘C',
      onClick: (ctx) => ctx.row && options.onCopy?.(ctx.row),
    });
  }

  if (items.length > 0 && options?.onDelete) {
    items.push({ id: 'sep1', type: 'separator' });
  }

  if (options?.onDelete) {
    items.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      danger: true,
      shortcut: 'Del',
      onClick: (ctx) => ctx.row && options.onDelete?.(ctx.row),
    });
  }

  if (options?.customItems?.length) {
    if (items.length > 0) {
      items.push({ id: 'sep-custom', type: 'separator' });
    }
    items.push(...options.customItems);
  }

  return items;
}

/**
 * Create default cell context menu items
 */
export function createCellContextMenuItems<TRow>(options?: {
  onCopyCellValue?: (value: unknown) => void;
  onCopyRow?: (row: TRow) => void;
  onEditCell?: (row: TRow, column: ColumnDef<TRow>) => void;
  onFilterByValue?: (column: ColumnDef<TRow>, value: unknown) => void;
}): ContextMenuItem<TRow>[] {
  const items: ContextMenuItem<TRow>[] = [];

  items.push({
    id: 'copy-cell',
    label: 'Copy Cell Value',
    icon: Copy,
    shortcut: '⌘C',
    onClick: (ctx) => {
      if (ctx.cellValue !== undefined) {
        const text = String(ctx.cellValue);
        navigator.clipboard.writeText(text);
        options?.onCopyCellValue?.(ctx.cellValue);
      }
    },
  });

  items.push({
    id: 'copy-row',
    label: 'Copy Row',
    icon: Clipboard,
    onClick: (ctx) => {
      if (ctx.row) {
        navigator.clipboard.writeText(JSON.stringify(ctx.row, null, 2));
        options?.onCopyRow?.(ctx.row);
      }
    },
  });

  if (options?.onEditCell) {
    items.push({ id: 'sep1', type: 'separator' });
    items.push({
      id: 'edit-cell',
      label: 'Edit Cell',
      icon: Edit,
      shortcut: 'F2',
      onClick: (ctx) => {
        if (ctx.row && ctx.column) {
          options.onEditCell?.(ctx.row, ctx.column);
        }
      },
    });
  }

  if (options?.onFilterByValue) {
    items.push({ id: 'sep2', type: 'separator' });
    items.push({
      id: 'filter-value',
      label: 'Filter by This Value',
      icon: Filter,
      onClick: (ctx) => {
        if (ctx.column && ctx.cellValue !== undefined) {
          options.onFilterByValue?.(ctx.column, ctx.cellValue);
        }
      },
    });
  }

  return items;
}

/**
 * Create column header context menu items
 */
export function createColumnContextMenuItems<TRow>(options?: {
  onSort?: (column: ColumnDef<TRow>, direction: 'asc' | 'desc') => void;
  onHide?: (column: ColumnDef<TRow>) => void;
  onPin?: (column: ColumnDef<TRow>, position: 'left' | 'right' | null) => void;
  onFilter?: (column: ColumnDef<TRow>) => void;
  pinnedPosition?: 'left' | 'right' | null;
}): ContextMenuItem<TRow>[] {
  const items: ContextMenuItem<TRow>[] = [];

  if (options?.onSort) {
    items.push({
      id: 'sort-asc',
      label: 'Sort Ascending',
      icon: ArrowUp,
      onClick: (ctx) => ctx.column && options.onSort?.(ctx.column, 'asc'),
    });

    items.push({
      id: 'sort-desc',
      label: 'Sort Descending',
      icon: ArrowDown,
      onClick: (ctx) => ctx.column && options.onSort?.(ctx.column, 'desc'),
    });
  }

  if (options?.onPin) {
    items.push({ id: 'sep1', type: 'separator' });

    items.push({
      id: 'pin',
      label: 'Pin Column',
      icon: Pin,
      type: 'submenu',
      children: [
        {
          id: 'pin-left',
          label: 'Pin to Left',
          type: 'checkbox',
          checked: options.pinnedPosition === 'left',
          onClick: (ctx) => ctx.column && options.onPin?.(ctx.column, 'left'),
        },
        {
          id: 'pin-right',
          label: 'Pin to Right',
          type: 'checkbox',
          checked: options.pinnedPosition === 'right',
          onClick: (ctx) => ctx.column && options.onPin?.(ctx.column, 'right'),
        },
        { id: 'sep-pin', type: 'separator' },
        {
          id: 'unpin',
          label: 'Unpin',
          icon: PinOff,
          disabled: !options.pinnedPosition,
          onClick: (ctx) => ctx.column && options.onPin?.(ctx.column, null),
        },
      ],
    });
  }

  if (options?.onHide) {
    items.push({
      id: 'hide',
      label: 'Hide Column',
      icon: EyeOff,
      onClick: (ctx) => ctx.column && options.onHide?.(ctx.column),
    });
  }

  if (options?.onFilter) {
    items.push({ id: 'sep2', type: 'separator' });
    items.push({
      id: 'filter',
      label: 'Filter...',
      icon: Filter,
      onClick: (ctx) => ctx.column && options.onFilter?.(ctx.column),
    });
  }

  return items;
}

export default ContextMenu;
