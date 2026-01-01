# Loan Pricing System

A comprehensive loan pricing and management platform for trade finance operations.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [State Management](#state-management)
- [API Reference](#api-reference)
- [Development Guide](#development-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Components          │  Hooks              │  State (Redux)             │
│  ├── pricing/        │  ├── useLiveCalc    │  ├── changeSlice          │
│  ├── customers/      │  ├── usePlayback    │  └── playbackSlice        │
│  ├── ui/             │  └── useFiltered    │                            │
│  └── grid/           │                     │                            │
├─────────────────────────────────────────────────────────────────────────┤
│                           API Client (lib/api.ts)                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP/REST
┌───────────────────────────────────┴─────────────────────────────────────┐
│                              SERVER (Express)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Routes              │  Services            │  Models (Mongoose)        │
│  ├── loans.ts        │  ├── loanService     │  ├── Loan                 │
│  ├── feeConfigs.ts   │  ├── calcService     │  ├── FeeConfig            │
│  ├── customers.ts    │  ├── auditService    │  ├── Customer             │
│  └── snapshots.ts    │  └── snapshotService │  └── Snapshot             │
├─────────────────────────────────────────────────────────────────────────┤
│                              MongoDB                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Redux Toolkit, React Query, Tailwind CSS |
| Bundler | Rspack |
| Backend | Express.js, Node.js |
| Database | MongoDB with Mongoose ODM |
| Validation | Zod (shared between client/server) |
| Types | TypeScript (strict mode) |

---

## Project Structure

```
loan_pricing/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       │   ├── pricing/    # Loan pricing UI (main feature)
│       │   ├── customers/  # Customer management
│       │   ├── grid/       # Reusable grid components
│       │   └── ui/         # Base UI components (Radix)
│       ├── hooks/          # Custom React hooks
│       ├── stores/         # Redux state management
│       ├── lib/            # Utilities and API client
│       └── types/          # Client-specific types
│
├── server/                 # Express backend
│   └── src/
│       ├── routes/         # API endpoint handlers
│       ├── services/       # Business logic layer
│       ├── models/         # Mongoose schemas
│       ├── middleware/     # Express middleware
│       └── utils/          # Helper utilities
│
├── shared/                 # Shared code (types, validation)
│   └── src/
│       ├── types.ts        # Domain type definitions
│       └── validation.ts   # Zod validation schemas
│
└── e2e/                    # End-to-end tests
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (or Docker)
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd loan_pricing

# Install dependencies
npm install

# Start MongoDB (if using Docker)
docker run -d -p 27017:27017 --name mongo mongo:latest

# Seed the database
npm run seed

# Start development servers
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server in dev mode |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run seed` | Seed database with sample data |
| `npm run seed:heavy` | Seed with large dataset for testing |

---

## Core Concepts

### Loans

A loan represents a financing arrangement backed by invoices:

```typescript
interface Loan {
  id: string;
  loanNumber: string;
  borrowerName: string;
  totalAmount: number;
  currency: string;
  pricing: {
    baseRate: number;      // e.g., 0.05 (5%)
    spread: number;        // e.g., 0.02 (2%)
    effectiveRate: number; // baseRate + spread
    dayCountConvention: '30/360' | 'actual/360' | 'actual/365';
    accrualMethod: 'simple' | 'compound';
  };
  invoices: Invoice[];     // Backing invoices
  fees: Fee[];             // Applied fees
  status: 'draft' | 'active' | 'funded' | 'closed';
  pricingStatus: 'pending' | 'approved' | 'locked';
}
```

### Fees

Fees can be calculated in multiple ways:

| Type | Calculation |
|------|------------|
| Flat | Fixed amount |
| Percentage | Rate × Basis Amount |
| Tiered | Progressive rate based on amount brackets |

### Calculations (calculationService.ts)

All financial calculations are centralized in `calculationService.ts`:

```typescript
// Interest calculation
interestAmount = principal × effectiveRate × dayCountFraction

// Net proceeds
netProceeds = principal - interestAmount - totalFees
```

### Snapshots (Playback Feature)

Snapshots capture loan states at points in time, enabling:
- Historical comparison
- Audit trail visualization
- "What-if" analysis

---

## State Management

### Redux Store Structure

```typescript
{
  changes: {
    changes: Change[];      // Pricing field modifications
    feeChanges: FeeChange[]; // Fee add/update/delete
  },
  playback: {
    isActive: boolean;
    currentSnapshot: Snapshot | null;
  }
}
```

### Change Tracking Flow

```
User edits field
      ↓
trackChange(loanId, field, oldValue, newValue)
      ↓
Redux store updated
      ↓
calculatePreview(loanId) [debounced 150ms]
      ↓
API: POST /loans/:id/preview-full
      ↓
Preview state updated
      ↓
UI shows delta indicators
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useChangeStore()` | Track and query pending changes |
| `useLiveCalculation()` | Real-time pricing previews |
| `usePlayback()` | Snapshot playback controls |
| `useFilteredLoans()` | Loan filtering and grouping |

---

## API Reference

### Loans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans` | List loans with filters |
| GET | `/api/loans/:id` | Get loan details |
| PUT | `/api/loans/:id` | Update loan |
| POST | `/api/loans/:id/preview-pricing` | Preview rate changes |
| POST | `/api/loans/:id/preview-full` | Preview with fee changes |
| PUT | `/api/loans/batch` | Batch update loans |
| POST | `/api/loans/:id/split` | Split loan |

### Fees

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loans/:id/fees` | Add fee to loan |
| PUT | `/api/loans/:id/fees/:feeId` | Update fee |
| DELETE | `/api/loans/:id/fees/:feeId` | Remove fee |

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loans/:id/invoices` | Add invoice |
| PUT | `/api/loans/:id/invoices/:invId` | Update invoice |
| DELETE | `/api/loans/:id/invoices/:invId` | Remove invoice |
| POST | `/api/loans/:id/invoices/:invId/move` | Move to another loan |

### Snapshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/snapshots` | List snapshots |
| GET | `/api/snapshots/:id` | Get snapshot with loans |
| POST | `/api/snapshots` | Create snapshot |

---

## Development Guide

### Code Organization Principles

1. **Services Handle Business Logic**
   - Routes should only handle HTTP concerns
   - All calculations go through `calculationService.ts`
   - All CRUD operations go through `loanService.ts`

2. **Single Source of Truth**
   - Types defined in `shared/types.ts`
   - Validation schemas in `shared/validation.ts`
   - State in Redux (accessed via `useChangeStore()`)

3. **Component Structure**
   - Smart components in `pricing/` manage state
   - Dumb components in `ui/` are purely presentational
   - Hooks encapsulate reusable logic

### Adding a New Feature

1. **Define Types** in `shared/src/types.ts`
2. **Add Validation** in `shared/src/validation.ts`
3. **Create Service Methods** in `server/src/services/`
4. **Add Route Handler** in `server/src/routes/`
5. **Add API Function** in `client/src/lib/api.ts`
6. **Create/Update Components** in `client/src/components/`

### Testing

```bash
# Run unit tests
npm run test

# Run e2e tests (requires running server)
npm run test:e2e

# Run with mock server
MOCK_MODE=true npm run test:e2e
```

### Debugging

1. **Client State**: Use Redux DevTools extension
2. **API Calls**: Check Network tab, all requests go to `/api/`
3. **Server Logs**: Console output shows route hits and errors
4. **Calculations**: Add breakpoints in `calculationService.ts`

---

## File Documentation

All major files include JSDoc headers explaining:
- Purpose and responsibilities
- Key exports and usage examples
- Related modules and dependencies

Example:
```typescript
/**
 * @fileoverview Calculation Service - Core Financial Calculations
 *
 * @module services/calculationService
 * @see loanService - For loan operations that trigger calculations
 */
```

---

## License

Proprietary - All rights reserved.
