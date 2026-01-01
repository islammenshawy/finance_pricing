# MFE (Micro-Frontend) Components

This module exposes components via Module Federation for consumption by other micro-frontends.

## Available Exports

| Module | Import Path | Description |
|--------|-------------|-------------|
| UI Primitives | `loanPricing/ui` | SearchBar, Button, Input, Dialog, Select, etc. |
| Grid System | `loanPricing/grid` | DataGrid, GridToolbar, cell renderers |
| Pages | `loanPricing/pages` | LoanPricingPage, CustomerPage |
| Hooks | `loanPricing/hooks` | useChangeStore, useLiveCalculation |

## Host App Configuration

```ts
// rspack.config.ts or webpack.config.js
new ModuleFederationPlugin({
  name: 'hostApp',
  remotes: {
    loanPricing: 'loanPricing@http://localhost:4000/remoteEntry.js',
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'react-redux': { singleton: true },
    '@reduxjs/toolkit': { singleton: true },
  },
})
```

## Usage Examples

### SearchBar

```tsx
import { SearchBar } from 'loanPricing/ui';

function Header() {
  const [search, setSearch] = useState('');

  return (
    <SearchBar
      value={search}
      onChange={setSearch}
      placeholder="Search..."
      debounceMs={300}
      shortcutKey="k"
    />
  );
}
```

### DataGrid with Toolbar

```tsx
import { DataGrid, GridToolbar, CurrencyCell } from 'loanPricing/grid';
import type { ColumnDef } from 'loanPricing/grid';

interface Order {
  id: string;
  customer: string;
  amount: number;
  status: string;
}

const columns: ColumnDef<Order>[] = [
  { id: 'customer', header: 'Customer', accessor: (row) => row.customer },
  { id: 'amount', header: 'Amount', accessor: (row) => row.amount, align: 'right' },
  { id: 'status', header: 'Status', accessor: (row) => row.status },
];

function OrdersPage() {
  const [data, setData] = useState<Order[]>([]);

  return (
    <div className="h-[600px] flex flex-col">
      <GridToolbar
        config={{
          search: { enabled: true, placeholder: 'Search orders...' },
          quickFilters: [
            { id: 'all', label: 'All', filter: () => true, default: true },
            { id: 'pending', label: 'Pending', filter: (r) => r.status === 'pending' },
          ],
        }}
        data={data}
        columns={columns}
      />
      <DataGrid
        data={data}
        columns={columns}
        getRowKey={(row) => row.id}
        virtualScroll={{ enabled: true, rowHeight: 44 }}
      />
    </div>
  );
}
```

### Full Page Mount

```tsx
import { LoanPricingPage } from 'loanPricing/pages';

// In your router
<Route path="/loans" element={<LoanPricingPage />} />
```

## Type Safety

All types are exported for TypeScript consumers:

```tsx
import type { ColumnDef, SearchBarProps, DataGridProps } from 'loanPricing/grid';
```

## Shared Dependencies

These dependencies must be configured as singletons in both host and remote:

- `react` / `react-dom` - React runtime
- `react-redux` / `@reduxjs/toolkit` - State management (if using hooks)
- `@tanstack/react-query` - Server state (if using pages)
