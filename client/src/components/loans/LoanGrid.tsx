import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { getLoans } from '@/lib/api';
import type { LoanListItem } from '@loan-pricing/shared';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  RefreshCw,
} from 'lucide-react';

interface LoanGridProps {
  onSelectLoan: (loan: LoanListItem) => void;
  selectedLoanId?: string;
}

const columnHelper = createColumnHelper<LoanListItem>();

export function LoanGrid({ onSelectLoan, selectedLoanId }: LoanGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['loans'],
    queryFn: () => getLoans(),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('loanNumber', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Loan #" />
        ),
        cell: (info) => (
          <span className="font-medium text-primary">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('borrowerName', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Borrower" />
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('totalAmount', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Amount" />
        ),
        cell: (info) => (
          <span className="font-mono">
            {formatCurrency(info.getValue(), info.row.original.currency)}
          </span>
        ),
      }),
      columnHelper.accessor('effectiveRate', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Rate" />
        ),
        cell: (info) => (
          <span className="font-mono">{formatPercent(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={status as 'draft' | 'in_review' | 'approved' | 'funded'}>
              {status.replace('_', ' ')}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('pricingStatus', {
        header: 'Pricing',
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={status as 'pending' | 'priced' | 'locked'}>
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('invoiceCount', {
        header: 'Invoices',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('feeCount', {
        header: 'Fees',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('maturityDate', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Maturity" />
        ),
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor('updatedAt', {
        header: ({ column }) => (
          <SortableHeader column={column} title="Updated" />
        ),
        cell: (info) => formatDate(info.getValue()),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search loans..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading loans...</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    No loans found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectLoan(row.original)}
                    className={`cursor-pointer ${
                      selectedLoanId === row.original.id ? 'selected' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {data?.total ?? 0} total loans
        </div>
      </div>
    </div>
  );
}

// Sortable header component
function SortableHeader({
  column,
  title,
}: {
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void };
  title: string;
}) {
  const sorted = column.getIsSorted();

  return (
    <button
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}
