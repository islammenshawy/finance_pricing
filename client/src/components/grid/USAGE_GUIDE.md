# DataGrid Component Usage Guide

This guide explains how to use the DataGrid component to build data-rich pages quickly.

## Quick Start

```tsx
import { DataGrid, type ColumnDef } from '@/components/grid';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<User>[] = [
  { id: 'name', header: 'Name', accessor: (row) => row.name },
  { id: 'email', header: 'Email', accessor: (row) => row.email },
  { id: 'status', header: 'Status', accessor: (row) => row.status },
];

function UsersPage() {
  const [users] = useState<User[]>([...]);

  return (
    <DataGrid
      data={users}
      columns={columns}
      getRowId={(user) => user.id}
    />
  );
}
```

## Table of Contents

1. [Flat Table (No Grouping)](#flat-table-no-grouping)
2. [Column Configuration](#column-configuration)
3. [Row Selection](#row-selection)
4. [Row Grouping](#row-grouping)
5. [Row Expansion](#row-expansion)
6. [Toolbar & Search](#toolbar--search)
7. [Sorting & Filtering](#sorting--filtering)
8. [Pagination](#pagination)
9. [Virtual Scrolling](#virtual-scrolling)
10. [Inline Editing](#inline-editing)
11. [Styling](#styling)
12. [Events](#events)
13. [Controlled vs Uncontrolled State](#controlled-vs-uncontrolled-state)
14. [Reusable Cell Renderers](#reusable-cell-renderers)
15. [Common Patterns & Recipes](#common-patterns--recipes)
16. [Keyboard Navigation](#keyboard-navigation)
17. [Collapsible Data Sections](#collapsible-data-sections)

---

## Flat Table (No Grouping)

By default, the grid renders as a flat table. Simply omit the `groupBy` prop:

```tsx
// Flat table - no groupBy prop needed
<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}

  // Optional features
  selection={{ mode: 'multiple', showCheckbox: true }}
  sortable={true}
  toolbar={{
    search: { enabled: true },
  }}
/>
```

Or explicitly set `groupBy={null}`:

```tsx
<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}
  groupBy={null}  // Explicit flat mode
/>
```

---

## Column Configuration

### Basic Column

```tsx
const columns: ColumnDef<Loan>[] = [
  {
    id: 'loanNumber',
    header: 'Loan #',
    accessor: (row) => row.loanNumber,
  },
];
```

### Column with Custom Cell Renderer

```tsx
{
  id: 'amount',
  header: 'Amount',
  cell: (row) => (
    <span className="font-mono">
      {formatCurrency(row.amount, row.currency)}
    </span>
  ),
  align: 'right',
}
```

### Column with Sorting

```tsx
{
  id: 'amount',
  header: 'Amount',
  accessor: (row) => row.amount,
  sortable: true,
  comparator: (a, b) => a.amount - b.amount,
}
```

### Column with Filtering

```tsx
{
  id: 'status',
  header: 'Status',
  accessor: (row) => row.status,
  filter: {
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Closed', value: 'closed' },
    ],
  },
}
```

### Column with Inline Editing

```tsx
{
  id: 'rate',
  header: 'Rate',
  accessor: (row) => row.rate,
  editor: {
    type: 'number',
    min: 0,
    max: 100,
    step: 0.01,
    onSave: async (row, newValue) => {
      await api.updateRate(row.id, newValue);
    },
  },
}
```

### Column Width & Resizing

```tsx
{
  id: 'description',
  header: 'Description',
  width: 300,          // Fixed width in pixels
  minWidth: 150,       // Min width when resizing
  maxWidth: 500,       // Max width when resizing
  resizable: true,     // Allow user to resize
}
```

### Pinned (Frozen) Columns

```tsx
{
  id: 'loanNumber',
  header: 'Loan #',
  pinned: 'left',      // 'left' | 'right' | null
}
```

---

## Row Selection

### Multiple Selection with Checkboxes

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  selection={{
    mode: 'multiple',
    showCheckbox: true,
    showSelectAll: true,
  }}
  events={{
    onSelectionChange: (selectedRows, selectedIds) => {
      console.log('Selected:', selectedIds);
    },
  }}
/>
```

### Single Selection

```tsx
selection={{
  mode: 'single',
  showCheckbox: true,
  rowClickSelects: true,
}}
```

---

## Row Grouping

### Group by Field

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  groupBy={{
    field: 'currency',
    defaultExpanded: true,
    collapsible: true,
  }}
/>
```

### Custom Group Header

```tsx
groupBy={{
  field: 'currency',
  headerRenderer: (currency, rows) => (
    <div className="flex items-center gap-2">
      <CurrencyIcon currency={currency} />
      <span>{currency}</span>
      <Badge>{rows.length} loans</Badge>
      <span className="ml-auto font-mono">
        Total: {formatCurrency(sum(rows, 'amount'), currency)}
      </span>
    </div>
  ),
}}
```

### Group by Computed Field

```tsx
groupBy={{
  field: (row) => row.createdAt.getFullYear().toString(),
  getGroupKey: (row) => `year-${row.createdAt.getFullYear()}`,
  groupSort: (a, b) => b.localeCompare(a), // Newest first
}}
```

---

## Row Expansion

### Basic Expandable Rows

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  expansion={{
    enabled: true,
    expandedContent: (loan) => (
      <div className="p-4 bg-muted">
        <h4>Loan Details</h4>
        <LoanDetailsPanel loan={loan} />
      </div>
    ),
  }}
/>
```

### Conditional Expansion

```tsx
expansion={{
  enabled: true,
  expandedContent: (loan) => <LoanDetails loan={loan} />,
  isRowExpandable: (loan) => loan.fees.length > 0,
  allowMultiple: false,
  expandOnRowClick: true,
}}
```

---

## Toolbar & Search

### Basic Search

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  toolbar={{
    search: {
      enabled: true,
      placeholder: 'Search loans...',
      debounceMs: 300,
    },
  }}
/>
```

### Full-Featured Toolbar

```tsx
toolbar={{
  // Search
  search: {
    enabled: true,
    placeholder: 'Search by loan number, customer...',
    showClearButton: true,
    showShortcutHint: true,
  },

  // Quick Filters
  quickFilters: [
    { id: 'all', label: 'All', filter: () => true, default: true },
    { id: 'active', label: 'Active', filter: (r) => r.status === 'active' },
    { id: 'pending', label: 'Pending', filter: (r) => r.status === 'pending', badge: 5 },
  ],

  // Action Buttons
  actions: [
    {
      id: 'add',
      label: 'Add Loan',
      icon: <Plus className="h-4 w-4" />,
      variant: 'primary',
      onClick: () => openAddDialog(),
    },
    {
      id: 'bulk-edit',
      label: 'Edit Selected',
      showWhen: 'hasSelection',
      onClick: (selectedRows) => openBulkEdit(selectedRows),
    },
  ],

  // Export
  export: {
    enabled: true,
    formats: ['csv', 'excel'],
    filename: 'loans-export',
  },

  // Column Toggle
  columnToggle: {
    enabled: true,
  },

  // Density
  density: {
    enabled: true,
    defaultDensity: 'standard',
  },
}}
```

### Server-Side Search

```tsx
toolbar={{
  search: {
    enabled: true,
    serverSide: true,
    onSearch: async (query) => {
      const results = await api.searchLoans(query);
      setLoans(results);
    },
  },
}}
```

### Search with Column Selector Dropdown

Allow users to search specific columns:

```tsx
toolbar={{
  search: {
    enabled: true,
    placeholder: 'Search...',

    // Enable column selector dropdown
    columnSelector: true,
    defaultSearchColumn: 'all',  // or specific column id

    // Define which columns are searchable
    searchableColumns: ['loanNumber', 'customerName', 'status'],
  },
}}
```

### Advanced Search Options

```tsx
toolbar={{
  search: {
    enabled: true,
    placeholder: 'Search loans...',

    // Behavior
    debounceMs: 300,           // Delay before search triggers
    minLength: 2,              // Min characters to trigger search

    // UX
    showClearButton: true,     // Show X to clear
    showShortcutHint: true,    // Show ⌘K hint
    shortcutKey: 'k',          // Keyboard shortcut
    autoFocus: false,          // Focus on mount

    // Layout
    position: 'left',          // 'left' | 'center' | 'right'
    width: 250,                // Fixed width
    expandOnFocus: true,       // Expand when focused
    expandedWidth: 400,        // Width when expanded

    // Highlighting
    highlightMatches: true,    // Highlight matching text in cells

    // Custom filter logic
    filterFn: (row, query, columns) => {
      const q = query.toLowerCase();
      return row.name.toLowerCase().includes(q) ||
             row.tags.some(tag => tag.includes(q));
    },
  },
}}
```

---

## Sorting & Filtering

### Enable Sorting

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  sortable={true}
  defaultSortColumn="loanNumber"
  defaultSortDirection="asc"
/>
```

### Multi-Column Sorting

```tsx
<DataGrid
  sortable={true}
  multiSort={true}
/>
```

### Column Filters

```tsx
<DataGrid
  filterable={true}
  events={{
    onFilterChange: (filters) => {
      console.log('Filters:', filters);
    },
  }}
/>
```

---

## Pagination

Alternative to virtual scrolling for smaller datasets:

### Client-Side Pagination

```tsx
<DataGrid
  data={allData}
  columns={columns}
  getRowId={(row) => row.id}
  pagination={{
    enabled: true,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    showPageSizeSelector: true,
  }}
/>
```

### Server-Side Pagination

```tsx
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(25);
const { data, total } = useQuery(['items', page, pageSize], () =>
  fetchItems({ page, pageSize })
);

<DataGrid
  data={data}
  columns={columns}
  getRowId={(row) => row.id}
  pagination={{
    enabled: true,
    pageSize: pageSize,
    currentPage: page,
    totalRows: total,  // Server provides total count
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
/>
```

---

## Virtual Scrolling

For large datasets (100+ rows), enable virtual scrolling:

```tsx
<DataGrid
  data={largeDataset}
  columns={columns}
  getRowId={(row) => row.id}
  virtualScroll={{
    enabled: true,
    rowHeight: 48,
    overscan: 5,
  }}
/>
```

---

## Inline Editing

### Text Editing

```tsx
{
  id: 'name',
  header: 'Name',
  accessor: (row) => row.name,
  editor: {
    type: 'text',
    validate: (value) => value.length > 0 ? null : 'Name required',
    onSave: async (row, newValue) => {
      await api.update(row.id, { name: newValue });
    },
  },
}
```

### Number Editing

```tsx
{
  id: 'rate',
  header: 'Rate %',
  accessor: (row) => row.rate,
  editor: {
    type: 'number',
    min: 0,
    max: 100,
    step: 0.01,
    onSave: async (row, newValue, oldValue) => {
      await api.updateRate(row.id, newValue);
      toast.success(`Rate changed from ${oldValue}% to ${newValue}%`);
    },
  },
}
```

### Select Editing

```tsx
{
  id: 'status',
  header: 'Status',
  accessor: (row) => row.status,
  editor: {
    type: 'select',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Active', value: 'active' },
      { label: 'Closed', value: 'closed' },
    ],
    onSave: async (row, newValue) => {
      await api.updateStatus(row.id, newValue);
    },
  },
}
```

---

## Styling

### Striped Rows

```tsx
<DataGrid
  stripedRows={true}
  showGridLines={true}
/>
```

### Dynamic Row Styling

```tsx
<DataGrid
  rowStyling={{
    getRowClassName: (row, index) => {
      if (row.isOverdue) return 'bg-red-50';
      if (row.isWarning) return 'bg-yellow-50';
      return '';
    },
    getRowStyle: (row) => ({
      borderLeft: `4px solid ${row.priorityColor}`,
    }),
    isRowDisabled: (row) => row.status === 'archived',
    isRowSelectable: (row) => row.status !== 'locked',
  }}
/>
```

### Compact Mode

```tsx
<DataGrid
  compact={true}
  // or
  density="compact"
/>
```

---

## Events

```tsx
<DataGrid
  events={{
    // Selection
    onSelectionChange: (rows, ids) => {},

    // Row interactions
    onRowClick: (row, event) => {},
    onRowDoubleClick: (row, event) => {},
    onRowContextMenu: (row, event) => {},

    // Expansion
    onRowExpand: (row, expanded) => {},
    onGroupExpand: (groupKey, expanded) => {},

    // Sorting
    onSortChange: (columnId, direction) => {},

    // Editing
    onCellChange: (row, columnId, newValue, oldValue) => {},
    onCellEditStart: (row, columnId) => {},
    onCellEditEnd: (row, columnId, saved) => {},

    // Column operations
    onColumnVisibilityChange: (columnId, visible) => {},
    onColumnOrderChange: (columnIds) => {},
    onColumnResize: (columnId, width) => {},
    onColumnPin: (columnId, position) => {},

    // Filtering
    onFilterChange: (filters) => {},
  }}
/>
```

---

## Controlled vs Uncontrolled State

The grid can operate in controlled or uncontrolled mode for each feature.

### Uncontrolled (Default)

Grid manages its own state internally:

```tsx
<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}
  defaultSortColumn="name"
  defaultSortDirection="asc"
/>
```

### Controlled

You manage state externally:

```tsx
const [gridState, setGridState] = useState<GridState>({
  selectedIds: new Set(),
  expandedIds: new Set(),
  sortColumn: 'name',
  sortDirection: 'asc',
  columnVisibility: { email: true, phone: false },
});

<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}

  // Pass controlled state
  state={gridState}

  // Handle state changes
  events={{
    onSelectionChange: (rows, ids) =>
      setGridState(s => ({ ...s, selectedIds: ids })),
    onSortChange: (col, dir) =>
      setGridState(s => ({ ...s, sortColumn: col, sortDirection: dir })),
    onColumnVisibilityChange: (colId, visible) =>
      setGridState(s => ({
        ...s,
        columnVisibility: { ...s.columnVisibility, [colId]: visible },
      })),
  }}
/>
```

### Controlled Toolbar

```tsx
const [toolbarState, setToolbarState] = useState<ToolbarState>({
  searchQuery: '',
  activeQuickFilter: 'all',
  density: 'standard',
});

<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}

  toolbarState={toolbarState}
  toolbarEvents={{
    onSearchChange: (query) =>
      setToolbarState(s => ({ ...s, searchQuery: query })),
    onQuickFilterChange: (filterId) =>
      setToolbarState(s => ({ ...s, activeQuickFilter: filterId })),
    onDensityChange: (density) =>
      setToolbarState(s => ({ ...s, density })),
  }}
/>
```

---

## Reusable Cell Renderers

The grid includes pre-built cell renderers:

### Currency Cell

```tsx
import { CurrencyCell, CurrencyChangeCell } from '@/components/grid';

{
  id: 'amount',
  header: 'Amount',
  cell: (row) => (
    <CurrencyCell
      value={row.amount}
      currency={row.currency}
    />
  ),
}

// With change indicator
{
  id: 'interest',
  header: 'Interest',
  cell: (row) => (
    <CurrencyChangeCell
      value={row.newInterest}
      previousValue={row.originalInterest}
      currency={row.currency}
    />
  ),
}
```

### Status Badge Cell

```tsx
import { StatusBadgeCell } from '@/components/grid';

{
  id: 'status',
  header: 'Status',
  cell: (row) => (
    <StatusBadgeCell status={row.pricingStatus} />
  ),
}
```

### Editable Number Cell

```tsx
import { EditableNumberCell } from '@/components/grid';

{
  id: 'rate',
  header: 'Rate',
  cell: (row) => (
    <EditableNumberCell
      value={row.rate}
      suffix="%"
      onChange={(newValue) => handleRateChange(row.id, newValue)}
      showChangeIndicator
      previousValue={row.originalRate}
    />
  ),
}
```

### Action Cell

```tsx
import { ActionCell, IconButtonCell } from '@/components/grid';

{
  id: 'actions',
  header: '',
  width: 100,
  cell: (row) => (
    <ActionCell>
      <IconButtonCell
        icon={<Pencil className="h-4 w-4" />}
        onClick={() => openEdit(row)}
        tooltip="Edit"
      />
      <IconButtonCell
        icon={<Trash className="h-4 w-4" />}
        onClick={() => openDelete(row)}
        tooltip="Delete"
        variant="destructive"
      />
    </ActionCell>
  ),
}
```

---

## Complete Example

```tsx
import {
  DataGrid,
  GridToolbar,
  CurrencyCell,
  StatusBadgeCell,
  EditableNumberCell,
  type ColumnDef,
} from '@/components/grid';

interface Loan {
  id: string;
  loanNumber: string;
  amount: number;
  currency: string;
  baseRate: number;
  spread: number;
  effectiveRate: number;
  status: 'draft' | 'active' | 'closed';
}

function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const columns: ColumnDef<Loan>[] = [
    {
      id: 'loanNumber',
      header: 'Loan #',
      accessor: (row) => row.loanNumber,
      pinned: 'left',
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row) => <CurrencyCell value={row.amount} currency={row.currency} />,
      align: 'right',
      sortable: true,
    },
    {
      id: 'baseRate',
      header: 'Base Rate',
      cell: (row) => (
        <EditableNumberCell
          value={row.baseRate}
          suffix="%"
          onChange={(val) => updateRate(row.id, 'baseRate', val)}
        />
      ),
      align: 'right',
    },
    {
      id: 'spread',
      header: 'Spread',
      cell: (row) => (
        <EditableNumberCell
          value={row.spread}
          suffix="%"
          onChange={(val) => updateRate(row.id, 'spread', val)}
        />
      ),
      align: 'right',
    },
    {
      id: 'effectiveRate',
      header: 'Effective',
      accessor: (row) => `${row.effectiveRate.toFixed(2)}%`,
      align: 'right',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadgeCell status={row.status} />,
    },
  ];

  return (
    <DataGrid
      data={loans}
      columns={columns}
      getRowId={(loan) => loan.id}

      // Grouping
      groupBy={{
        field: 'currency',
        defaultExpanded: true,
      }}

      // Selection
      selection={{
        mode: 'multiple',
        showCheckbox: true,
      }}

      // Toolbar
      toolbar={{
        search: {
          enabled: true,
          placeholder: 'Search loans...',
        },
        quickFilters: [
          { id: 'all', label: 'All', filter: () => true, default: true },
          { id: 'active', label: 'Active', filter: (r) => r.status === 'active' },
        ],
        export: { enabled: true, formats: ['csv'] },
        columnToggle: { enabled: true },
      }}

      // Virtual scrolling for performance
      virtualScroll={{
        enabled: true,
        rowHeight: 48,
      }}

      // Styling
      stripedRows={true}
      stickyHeader={true}

      // Events
      events={{
        onSelectionChange: (rows, ids) => setSelectedIds(ids),
        onCellChange: (row, col, newVal) => {
          console.log(`Changed ${col} to ${newVal}`);
        },
      }}
    />
  );
}
```

---

## Type Reference

All types are exported from `@/components/grid`:

```tsx
import type {
  // Column
  ColumnDef,
  ColumnAlign,
  ColumnPinPosition,
  ColumnFilter,
  CellEditor,

  // Grid Config
  GroupConfig,
  SelectionConfig,
  ExpansionConfig,
  VirtualScrollConfig,
  PaginationConfig,

  // Toolbar
  ToolbarConfig,
  SearchConfig,
  QuickFilter,
  ToolbarAction,
  ExportConfig,

  // Events
  GridEvents,
  ToolbarEvents,

  // State
  GridState,
  ToolbarState,

  // Props
  DataGridProps,
  GridToolbarProps,
} from '@/components/grid';
```

---

## Common Patterns & Recipes

### Master-Detail View

Grid with expandable rows showing related data:

```tsx
<DataGrid
  data={orders}
  columns={orderColumns}
  getRowId={(order) => order.id}
  expansion={{
    enabled: true,
    expandedContent: (order) => (
      <div className="p-4 bg-muted/50">
        <h4 className="font-medium mb-2">Order Items</h4>
        <DataGrid
          data={order.items}
          columns={itemColumns}
          getRowId={(item) => item.id}
          compact={true}
        />
      </div>
    ),
  }}
/>
```

### Bulk Actions with Selection

Show actions when rows are selected:

```tsx
<DataGrid
  data={users}
  columns={columns}
  getRowId={(user) => user.id}
  selection={{ mode: 'multiple', showCheckbox: true }}
  toolbar={{
    actions: [
      {
        id: 'delete',
        label: 'Delete Selected',
        icon: <Trash className="h-4 w-4" />,
        variant: 'destructive',
        showWhen: 'hasSelection',
        onClick: async (selectedRows) => {
          await api.deleteUsers(selectedRows.map(r => r.id));
          refetch();
        },
      },
      {
        id: 'export-selected',
        label: 'Export Selected',
        icon: <Download className="h-4 w-4" />,
        showWhen: 'hasSelection',
        onClick: (selectedRows) => exportToCsv(selectedRows),
      },
    ],
  }}
/>
```

### CRUD Table with Add/Edit Dialog

```tsx
function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const columns: ColumnDef<User>[] = [
    { id: 'name', header: 'Name', accessor: (r) => r.name },
    { id: 'email', header: 'Email', accessor: (r) => r.email },
    {
      id: 'actions',
      header: '',
      width: 80,
      cell: (row) => (
        <ActionCell>
          <IconButtonCell
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => setEditingUser(row)}
          />
          <IconButtonCell
            icon={<Trash className="h-4 w-4" />}
            onClick={() => handleDelete(row.id)}
            variant="destructive"
          />
        </ActionCell>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        data={users}
        columns={columns}
        getRowId={(user) => user.id}
        toolbar={{
          search: { enabled: true },
          actions: [
            {
              id: 'add',
              label: 'Add User',
              icon: <Plus className="h-4 w-4" />,
              variant: 'primary',
              onClick: () => setIsAddOpen(true),
            },
          ],
        }}
      />
      <AddUserDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
    </>
  );
}
```

### Filtered Data with URL Sync

Sync filters with URL for shareable links:

```tsx
function FilteredTable() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilter = searchParams.get('filter') || 'all';
  const initialSearch = searchParams.get('q') || '';

  return (
    <DataGrid
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      toolbarState={{
        searchQuery: initialSearch,
        activeQuickFilter: initialFilter,
      }}
      toolbarEvents={{
        onSearchChange: (query) => {
          setSearchParams(prev => {
            if (query) prev.set('q', query);
            else prev.delete('q');
            return prev;
          });
        },
        onQuickFilterChange: (filterId) => {
          setSearchParams(prev => {
            if (filterId && filterId !== 'all') prev.set('filter', filterId);
            else prev.delete('filter');
            return prev;
          });
        },
      }}
      toolbar={{
        search: { enabled: true },
        quickFilters: [
          { id: 'all', label: 'All', filter: () => true },
          { id: 'active', label: 'Active', filter: (r) => r.status === 'active' },
          { id: 'pending', label: 'Pending', filter: (r) => r.status === 'pending' },
        ],
      }}
    />
  );
}
```

### Real-time Data Updates

Handle live data with optimistic updates:

```tsx
function LiveDataGrid() {
  const { data, mutate } = useSWR('/api/items', fetcher, {
    refreshInterval: 5000, // Poll every 5s
  });

  const handleCellChange = async (row, columnId, newValue) => {
    // Optimistic update
    mutate(
      data.map(r => r.id === row.id ? { ...r, [columnId]: newValue } : r),
      false // Don't revalidate yet
    );

    try {
      await api.updateItem(row.id, { [columnId]: newValue });
      mutate(); // Revalidate after success
    } catch (error) {
      mutate(); // Revert on error
      toast.error('Failed to update');
    }
  };

  return (
    <DataGrid
      data={data || []}
      columns={columns}
      getRowId={(row) => row.id}
      events={{ onCellChange: handleCellChange }}
    />
  );
}
```

---

## Keyboard Navigation

The grid supports full keyboard navigation similar to AG-Grid and Excel.

### Default Keyboard Mappings

| Key | Action |
|-----|--------|
| `↑` `↓` `←` `→` | Navigate between cells/rows |
| `Tab` | Move to next cell (or row) |
| `Shift+Tab` | Move to previous cell (or row) |
| `Enter` | Start editing / Expand row |
| `Escape` | Cancel editing / Clear focus |
| `Space` | Toggle row selection |
| `Home` | Go to first row |
| `End` | Go to last row |
| `Ctrl+Home` | Go to first cell |
| `Ctrl+End` | Go to last cell |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |
| `Ctrl+A` | Select all rows |
| `F2` | Start editing (alternative) |
| `Delete` | Clear cell content |
| `Ctrl+C` | Copy selected |
| `Ctrl+V` | Paste (if enabled) |
| `Ctrl+Z` | Undo (if enabled) |
| `Ctrl+Y` | Redo (if enabled) |

### Enable Keyboard Navigation

```tsx
// Simple enable (all defaults)
<DataGrid keyboard={true} />

// Or with configuration
<DataGrid
  keyboard={{
    enabled: true,
    tabBehavior: 'cell',
  }}
/>
```

### Tab Behavior Options

```tsx
keyboard={{
  // 'cell': Tab moves between cells, wraps to next row
  // 'row': Tab moves between rows
  // 'grid': Tab exits the grid (browser default)
  tabBehavior: 'cell',
}}
```

### Enter Key Behavior

```tsx
keyboard={{
  // 'startEditing': Begin editing focused cell
  // 'navigateDown': Move to cell below (Excel-like)
  // 'expandRow': Toggle row expansion
  // 'selectRow': Toggle row selection
  enterBehavior: 'startEditing',
}}
```

### Excel-like Navigation

```tsx
<DataGrid
  keyboard={{
    enabled: true,
    tabBehavior: 'cell',
    enterBehavior: 'navigateDown',  // Enter moves down like Excel
    editOnKeyPress: true,            // Start editing by typing
    wrapNavigation: true,            // Arrow right at end wraps to next row
    enableCellTextSelection: true,
  }}
/>
```

### Custom Key Bindings

```tsx
<DataGrid
  keyboard={{
    enabled: true,
    bindings: [
      // F2 to edit (in addition to Enter)
      { key: 'F2', action: 'startEditing' },

      // Delete to clear
      { key: 'Delete', action: 'delete' },

      // Custom handler
      {
        key: 'F5',
        action: (event) => {
          event.preventDefault();
          refreshData();
        },
      },

      // Ctrl+Shift+C for custom copy
      { key: 'c', ctrl: true, shift: true, action: 'copy' },
    ],
  }}
/>
```

### Keyboard Event Callbacks

```tsx
<DataGrid
  keyboard={{
    enabled: true,

    // Intercept before default handling
    onKeyDown: (event, { focusedRowIndex, focusedColIndex, isEditing }) => {
      if (event.key === 'F5') {
        refreshData();
        return false; // Prevent default grid handling
      }
      return true; // Allow default handling
    },

    // Focus changes
    onFocusChange: (rowIndex, colIndex) => {
      console.log(`Focused: row ${rowIndex}, col ${colIndex}`);
    },

    // Editing lifecycle
    onEditStart: (rowIndex, colIndex) => {
      console.log('Started editing');
    },
    onEditEnd: (rowIndex, colIndex, cancelled) => {
      console.log(cancelled ? 'Edit cancelled' : 'Edit saved');
    },

    // Clipboard
    onCopy: (selectedData) => {
      navigator.clipboard.writeText(JSON.stringify(selectedData));
    },
    onPaste: (data, rowIndex, colIndex) => {
      handlePaste(data, rowIndex, colIndex);
    },

    // Delete
    onDelete: (rowIndex, colIndex) => {
      clearCell(rowIndex, colIndex);
    },

    // Undo/Redo
    onUndo: () => undoLastChange(),
    onRedo: () => redoLastChange(),
  }}
/>
```

### Suppress Specific Keys

```tsx
<DataGrid
  keyboard={{
    enabled: true,
    // Disable default handling for these keys
    suppressKeys: ['Enter', 'Tab'],
  }}
/>
```

### Programmatic Focus Control

```tsx
import { useGridKeyboard } from '@/components/grid';

function MyGrid() {
  const {
    focusedRowIndex,
    focusedColIndex,
    setFocusedRow,
    setFocusedCell,
    clearFocus,
    isRowFocused,
    isCellFocused,
  } = useGridKeyboard({
    rowCount: data.length,
    columnCount: columns.length,
    enabled: true,
  });

  // Focus specific row
  const goToRow = (index: number) => setFocusedRow(index);

  // Focus specific cell
  const goToCell = (row: number, col: number) => setFocusedCell(row, col);

  // Check focus state
  const isActive = isRowFocused(5);
}
```

### Accessibility (ARIA)

The grid automatically adds ARIA attributes for screen readers:

- `role="grid"` on container
- `role="row"` on each row
- `role="gridcell"` on each cell
- `aria-selected` for selected rows
- `aria-expanded` for expandable rows
- `tabindex` for keyboard focus

---

## Collapsible Data Sections

For nested data like invoices or line items within an expanded row, use `CollapsibleDataSection`.
It provides controlled height with scrolling, built-in search, and is collapsed by default.

### Basic Usage

```tsx
import { CollapsibleDataSection } from '@/components/grid';

<CollapsibleDataSection
  title="Invoices"
  data={loan.invoices}
  getItemId={(inv) => inv.id}
  maxHeight={250}
  search={{ fields: ['invoiceNumber', 'debtorName'] }}
  renderItem={(invoice) => (
    <div className="px-3 py-2 border-b flex justify-between">
      <span>{invoice.invoiceNumber}</span>
      <span>{formatCurrency(invoice.amount)}</span>
    </div>
  )}
/>
```

### With Table Header and Actions

```tsx
<CollapsibleDataSection
  title="Invoices"
  data={invoices}
  getItemId={(inv) => inv.id}
  defaultExpanded={false}
  maxHeight={300}

  // Search configuration (uses same pattern as grid toolbar)
  search={{
    enabled: true,
    fields: ['invoiceNumber', 'debtorName', 'description'],
    placeholder: 'Search invoices...',
    debounceMs: 200,
  }}

  // Header extras
  headerExtra={<Badge>{formatCurrency(totalAmount)}</Badge>}
  headerActions={
    <Button size="sm" onClick={handleAddInvoice}>
      <Plus className="h-3 w-3 mr-1" />
      Add
    </Button>
  }

  // Table header row
  renderHeader={() => (
    <div className="grid grid-cols-5 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
      <span>Invoice #</span>
      <span>Debtor</span>
      <span className="text-right">Amount</span>
      <span className="text-center">Due Date</span>
      <span className="text-right">Actions</span>
    </div>
  )}

  // Render each row
  renderItem={(invoice, index, { isHighlighted, searchQuery }) => (
    <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b hover:bg-muted/20">
      <span className="font-medium">{invoice.invoiceNumber}</span>
      <span>{invoice.debtorName}</span>
      <span className="text-right font-mono">{formatCurrency(invoice.amount)}</span>
      <span className="text-center">{formatDate(invoice.dueDate)}</span>
      <div className="text-right">
        <Button size="sm" variant="ghost" onClick={() => editInvoice(invoice)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )}

  emptyMessage="No invoices"
  emptySearchMessage="No matching invoices"
/>
```

### Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Section header title |
| `data` | `T[]` | required | Data array |
| `getItemId` | `(item: T) => string` | required | Unique ID extractor |
| `renderItem` | `(item, index, context) => ReactNode` | required | Item renderer |
| `search` | `boolean \| SectionSearchConfig` | `false` | Enable search |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state |
| `expanded` | `boolean` | - | Controlled expanded state |
| `maxHeight` | `number` | `300` | Max height before scroll (px) |
| `showCount` | `boolean` | `true` | Show item count badge |
| `headerExtra` | `ReactNode` | - | Extra header content |
| `headerActions` | `ReactNode` | - | Action buttons in header |
| `renderHeader` | `() => ReactNode` | - | Column header renderer |
| `bordered` | `boolean` | `true` | Show border |

### Search Configuration

```tsx
search={{
  enabled: true,                    // Enable search
  fields: ['name', 'code'],         // Fields to search (dot notation supported)
  filterFn: (item, query) => ...,   // Custom filter function
  placeholder: 'Search...',         // Input placeholder
  debounceMs: 200,                  // Debounce delay
  highlightMatches: true,           // Highlight matching text
  shortcutKey: 'f',                 // Ctrl/Cmd + key to focus
}}
```

### Using in Expanded Row Content

```tsx
<DataGrid
  data={loans}
  columns={columns}
  getRowId={(loan) => loan.id}
  expansion={{
    enabled: true,
    expandedContent: (loan) => (
      <div className="p-4 space-y-4">
        {/* Invoices Section */}
        <CollapsibleDataSection
          title="Invoices"
          data={loan.invoices}
          getItemId={(inv) => inv.id}
          search={{ fields: ['invoiceNumber', 'debtorName'] }}
          maxHeight={200}
          headerExtra={<Badge>{loan.invoices.length}</Badge>}
          renderItem={(inv) => <InvoiceRow invoice={inv} />}
        />

        {/* Fees Section */}
        <CollapsibleDataSection
          title="Fees"
          data={loan.fees}
          getItemId={(fee) => fee.id}
          search={{ fields: ['name', 'code'] }}
          maxHeight={150}
          renderItem={(fee) => <FeeRow fee={fee} />}
        />
      </div>
    ),
  }}
/>
```

---

## Dependencies

The DataGrid component requires these dependencies:

```json
{
  "@tanstack/react-virtual": "^3.x",
  "@radix-ui/react-dropdown-menu": "^2.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x"
}
```

UI components used internally:
- `@/components/ui/button` - Button component
- `@/components/ui/input` - Input component
- `@/components/ui/dropdown-menu` - Dropdown menus
- `@/lib/utils` - `cn()` utility for classnames
