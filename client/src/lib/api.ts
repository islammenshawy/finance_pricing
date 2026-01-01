/**
 * @fileoverview API Client - Backend Communication Layer
 *
 * This module provides a type-safe API client for all backend operations.
 * It is the single point of communication between the frontend and server.
 *
 * ARCHITECTURE:
 * ```
 * Component → API Client → Express Server → MongoDB
 *                ↓
 *         [Type-safe requests with shared types]
 * ```
 *
 * API ENDPOINTS BY DOMAIN:
 * - Loans: CRUD, pricing preview, batch operations, splitting
 * - Fees: Add, update, remove fees from loans
 * - Invoices: Add, update, remove, move between loans
 * - Fee Configs: Template fee configurations
 * - Currencies: Currency list and FX rates
 * - Customers: Customer management with loan aggregation
 * - Snapshots: Historical snapshots for playback feature
 *
 * ERROR HANDLING:
 * All API calls throw errors with message from server response.
 * Consumers should wrap calls in try/catch.
 *
 * AUTHENTICATION:
 * Currently uses demo headers (X-User-Id, X-User-Name).
 * TODO: Replace with real authentication system.
 *
 * @module lib/api
 * @see @loan-pricing/shared - Type definitions shared with backend
 *
 * @example
 * // Fetch loans with filtering
 * const { data, total } = await getLoans({ status: 'active' });
 *
 * @example
 * // Preview pricing changes
 * const preview = await previewFullLoanState(loanId, { baseRate: 0.06 }, feeChanges);
 *
 * @example
 * // Batch update multiple loans
 * const { results } = await batchUpdateLoans(items);
 */

import type {
  Loan,
  LoanListItem,
  FeeConfig,
  Currency,
  FxRate,
  AuditEntry,
  UpdateLoanRequest,
  AddFeeToLoanRequest,
  UpdateFeeRequest,
  SplitLoanRequest,
  CalculatePricingResponse,
  LoanPricing,
  SnapshotSummary,
  Snapshot,
  SnapshotListResponse,
  CreateSnapshotRequest,
} from '@loan-pricing/shared';

/** Base URL for all API requests */
const API_BASE = '/api';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Builds a query string from parameters, filtering out undefined/null values
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': 'user-1', // TODO: Replace with real auth
      'X-User-Name': 'Demo User',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// LOANS API
// ============================================

export interface GetLoansResponse {
  data: LoanListItem[];
  total: number;
}

export async function getLoans(params?: {
  status?: string;
  pricingStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<GetLoansResponse> {
  return request<GetLoansResponse>(`/loans${buildQueryString(params)}`);
}

export async function getLoan(id: string): Promise<Loan> {
  return request<Loan>(`/loans/${id}`);
}

export async function updateLoan(id: string, updates: UpdateLoanRequest): Promise<Loan> {
  return request<Loan>(`/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function previewPricing(
  id: string,
  pricing: Partial<LoanPricing>
): Promise<CalculatePricingResponse> {
  return request<CalculatePricingResponse>(`/loans/${id}/preview-pricing`, {
    method: 'POST',
    body: JSON.stringify({ pricing }),
  });
}

export interface FeeChangesPreview {
  adds?: Array<{ feeConfigId: string }>;
  updates?: Array<{ feeId: string; calculatedAmount: number }>;
  deletes?: Array<{ feeId: string }>;
}

export interface FullPreviewResponse {
  effectiveRate: number;
  interestAmount: number;
  totalFees: number;
  originalTotalFees: number;
  netProceeds: number;
  originalNetProceeds: number;
}

export async function previewFullLoanState(
  id: string,
  pricing?: Partial<LoanPricing>,
  feeChanges?: FeeChangesPreview
): Promise<FullPreviewResponse> {
  return request<FullPreviewResponse>(`/loans/${id}/preview-full`, {
    method: 'POST',
    body: JSON.stringify({ pricing, feeChanges }),
  });
}

// ============================================
// BATCH API
// ============================================

export interface BatchPreviewItem {
  loanId: string;
  pricing: Partial<LoanPricing>;
}

export interface BatchPreviewResult {
  loanId: string;
  success: boolean;
  preview?: CalculatePricingResponse;
  error?: string;
}

export interface BatchUpdateItem {
  loanId: string;
  updates: UpdateLoanRequest;
}

export interface BatchUpdateResult {
  loanId: string;
  success: boolean;
  loan?: Loan;
  error?: string;
}

export async function batchPreviewPricing(
  items: BatchPreviewItem[]
): Promise<{ results: BatchPreviewResult[] }> {
  return request<{ results: BatchPreviewResult[] }>('/loans/batch-preview-pricing', {
    method: 'POST',
    body: JSON.stringify(items),
  });
}

export async function batchUpdateLoans(
  items: BatchUpdateItem[]
): Promise<{ results: BatchUpdateResult[] }> {
  return request<{ results: BatchUpdateResult[] }>('/loans/batch', {
    method: 'PUT',
    body: JSON.stringify(items),
  });
}

export async function splitLoan(id: string, splitRequest: SplitLoanRequest): Promise<Loan[]> {
  return request<Loan[]>(`/loans/${id}/split`, {
    method: 'POST',
    body: JSON.stringify(splitRequest),
  });
}

export interface GetAuditResponse {
  entries: AuditEntry[];
  total: number;
}

export async function getLoanAudit(
  id: string,
  params?: {
    limit?: number;
    skip?: number;
    startDate?: string;
    endDate?: string;
    fieldName?: string;
  }
): Promise<GetAuditResponse> {
  return request<GetAuditResponse>(`/loans/${id}/audit${buildQueryString(params)}`);
}

// ============================================
// FEES API
// ============================================

export async function addFeeToLoan(
  loanId: string,
  fee: AddFeeToLoanRequest
): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/fees`, {
    method: 'POST',
    body: JSON.stringify(fee),
  });
}

export async function updateFee(
  loanId: string,
  feeId: string,
  updates: UpdateFeeRequest
): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/fees/${feeId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function removeFee(loanId: string, feeId: string): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/fees/${feeId}`, {
    method: 'DELETE',
  });
}

// ============================================
// INVOICES API
// ============================================

export interface AddInvoiceRequest {
  invoiceNumber: string;
  debtorName: string;
  amount: number;
  dueDate: string;
  description?: string;
  issueDate?: string;
}

export interface UpdateInvoiceRequest {
  invoiceNumber?: string;
  debtorName?: string;
  amount?: number;
  dueDate?: string;
  description?: string;
  status?: 'pending' | 'verified' | 'financed' | 'collected' | 'defaulted' | 'disputed';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export async function addInvoiceToLoan(
  loanId: string,
  invoice: AddInvoiceRequest
): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/invoices`, {
    method: 'POST',
    body: JSON.stringify(invoice),
  });
}

export async function updateInvoice(
  loanId: string,
  invoiceId: string,
  updates: UpdateInvoiceRequest
): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function removeInvoice(loanId: string, invoiceId: string): Promise<Loan> {
  return request<Loan>(`/loans/${loanId}/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
}

export interface MoveInvoiceResponse {
  sourceLoan: Loan;
  targetLoan: Loan;
}

export async function moveInvoice(
  sourceLoanId: string,
  invoiceId: string,
  targetLoanId: string
): Promise<MoveInvoiceResponse> {
  return request<MoveInvoiceResponse>(`/loans/${sourceLoanId}/invoices/${invoiceId}/move`, {
    method: 'POST',
    body: JSON.stringify({ targetLoanId }),
  });
}

// ============================================
// FEE CONFIGS API
// ============================================

export async function getFeeConfigs(): Promise<FeeConfig[]> {
  return request<FeeConfig[]>('/fee-configs');
}

// ============================================
// CURRENCIES API
// ============================================

export async function getCurrencies(): Promise<Currency[]> {
  return request<Currency[]>('/currencies');
}

export async function getFxRates(baseCurrency?: string): Promise<FxRate[]> {
  return request<FxRate[]>(`/currencies/rates${buildQueryString({ baseCurrency })}`);
}

// ============================================
// CUSTOMERS API
// ============================================

export interface Customer {
  id: string;
  code: string;
  name: string;
  country: string;
  industry: string;
  creditRating?: string;
  relationshipManager?: string;
  isActive: boolean;
}

export interface CustomerTotals {
  [currency: string]: {
    totalAmount: number;
    totalFees: number;
    totalInterest: number;
    netProceeds: number;
    loanCount: number;
  };
}

export interface CustomerWithLoans {
  customer: Customer;
  loans: Loan[];
  totals: CustomerTotals;
}

export async function getCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/customers');
}

export async function getCustomerWithLoans(id: string): Promise<CustomerWithLoans> {
  return request<CustomerWithLoans>(`/customers/${id}`);
}

// ============================================
// SNAPSHOTS API (Playback Feature)
// ============================================

/**
 * Get snapshots for a customer (timeline data without loan data)
 */
export async function getSnapshots(
  customerId: string,
  params?: { limit?: number; skip?: number }
): Promise<SnapshotListResponse> {
  return request<SnapshotListResponse>(
    `/snapshots${buildQueryString({ customerId, ...params })}`
  );
}

/**
 * Get a single snapshot with decompressed loans (for playback mode)
 */
export async function getSnapshot(id: string): Promise<Snapshot> {
  return request<Snapshot>(`/snapshots/${id}`);
}

/**
 * Create a new snapshot after saving changes
 */
export async function createSnapshot(data: CreateSnapshotRequest): Promise<SnapshotSummary> {
  return request<SnapshotSummary>('/snapshots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
