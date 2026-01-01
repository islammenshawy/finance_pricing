/**
 * @fileoverview Page Components MFE Export
 *
 * Full page components that can be mounted as standalone MFE modules.
 * These pages include all necessary state management and API integration.
 *
 * @module mfe/pages
 *
 * @example Mount LoanPricingPage
 * ```tsx
 * import { LoanPricingPage } from 'loanPricing/pages';
 *
 * // In your router
 * <Route path="/loans" element={<LoanPricingPage />} />
 * ```
 *
 * @example Mount CustomerPage with Props
 * ```tsx
 * import { CustomerPage } from 'loanPricing/pages';
 *
 * <CustomerPage customerId={id} onNavigateBack={() => navigate('/customers')} />
 * ```
 */

// =============================================================================
// FULL PAGE COMPONENTS
// =============================================================================

export { LoanPricingPage } from '@/components/pricing/LoanPricingPage';
export { CustomerPage } from '@/components/customers/CustomerPage';
export { CustomersListPage } from '@/components/customers/CustomersListPage';
