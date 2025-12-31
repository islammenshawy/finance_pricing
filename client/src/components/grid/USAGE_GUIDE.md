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

1. [Column Configuration](#column-configuration)
2. [Row Selection](#row-selection)
3. [Row Grouping](#row-grouping)
4. [Row Expansion](#row-expansion)
5. [Toolbar & Search](#toolbar--search)
6. [Sorting & Filtering](#sorting--filtering)
7. [Virtual Scrolling](#virtual-scrolling)
8. [Inline Editing](#inline-editing)
9. [Styling](#styling)
10. [Events](#events)
11. [Reusable Cell Renderers](#reusable-cell-renderers)

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
