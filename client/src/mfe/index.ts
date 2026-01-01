/**
 * @fileoverview MFE (Micro-Frontend) Exports
 *
 * This module provides all components that can be consumed by other MFEs
 * via Module Federation. Components are organized by category for easy discovery.
 *
 * @module mfe
 *
 * USAGE IN HOST APPLICATION:
 * ```tsx
 * // In rspack.config.ts of host app
 * new ModuleFederationPlugin({
 *   remotes: {
 *     loanPricing: 'loanPricing@http://localhost:4000/remoteEntry.js',
 *   },
 * })
 *
 * // In host app code
 * const { SearchBar } = await import('loanPricing/ui');
 * const { DataGrid } = await import('loanPricing/grid');
 * const { LoanPricingPage } = await import('loanPricing/pages');
 * ```
 */

// =============================================================================
// UI PRIMITIVES - Basic building blocks
// =============================================================================

export { SearchBar } from '@/components/ui/SearchBar';
export type { SearchBarProps } from '@/components/ui/SearchBar';

export { Button, buttonVariants } from '@/components/ui/button';
export { Input } from '@/components/ui/input';
export { Badge, badgeVariants } from '@/components/ui/badge';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
export { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
export { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
export { Combobox } from '@/components/ui/combobox';
export { ErrorBoundary, InlineErrorBoundary } from '@/components/ui/error-boundary';
