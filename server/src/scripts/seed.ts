import mongoose from 'mongoose';
import { Currency, FxRate, FeeConfig, Loan, Customer } from '../models';
import { recalculateLoan } from '../services/calculationService';
import type { FeeTier, FeeType, FeeCalculationType } from '@loan-pricing/shared';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loan_pricing';

// Type for fee seed data
interface SeedFee {
  feeConfigId: string;
  code: string;
  type: FeeType;
  name: string;
  calculationType: FeeCalculationType;
  rate?: number;
  flatAmount?: number;
  basisAmount?: 'principal' | 'outstanding' | 'total_invoices';
  tiers?: FeeTier[];
  currency: string;
  isOverridden?: boolean;
  isPaid?: boolean;
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Starting seed...');

  // Clear existing data
  await Promise.all([
    Currency.deleteMany({}),
    FxRate.deleteMany({}),
    FeeConfig.deleteMany({}),
    Loan.deleteMany({}),
    Customer.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ============================================
  // SEED CUSTOMERS
  // ============================================
  const customers = await Customer.insertMany([
    {
      code: 'ACME',
      name: 'Acme Trading Co.',
      country: 'United States',
      industry: 'Manufacturing',
      creditRating: 'A',
      relationshipManager: 'John Smith',
      isActive: true,
    },
    {
      code: 'EUROTRADE',
      name: 'EuroTrade GmbH',
      country: 'Germany',
      industry: 'Import/Export',
      creditRating: 'A+',
      relationshipManager: 'Maria Schmidt',
      isActive: true,
    },
    {
      code: 'GULF',
      name: 'Gulf Trading LLC',
      country: 'UAE',
      industry: 'Commodities',
      creditRating: 'BBB+',
      relationshipManager: 'Ahmed Hassan',
      isActive: true,
    },
    {
      code: 'BRITEX',
      name: 'British Export Ltd',
      country: 'United Kingdom',
      industry: 'Wholesale',
      creditRating: 'A-',
      relationshipManager: 'James Wilson',
      isActive: true,
    },
    {
      code: 'MULTITRADE',
      name: 'Multi-Currency Trading SA',
      country: 'Switzerland',
      industry: 'Trading',
      creditRating: 'AA-',
      relationshipManager: 'Hans Mueller',
      isActive: true,
    },
  ]);
  console.log(`Created ${customers.length} customers`);

  const acme = customers.find(c => c.code === 'ACME')!;
  const euroTrade = customers.find(c => c.code === 'EUROTRADE')!;
  const gulf = customers.find(c => c.code === 'GULF')!;
  const britex = customers.find(c => c.code === 'BRITEX')!;
  const multiTrade = customers.find(c => c.code === 'MULTITRADE')!

  // ============================================
  // SEED CURRENCIES
  // ============================================
  const currencies = await Currency.insertMany([
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, isActive: true },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, isActive: true },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, isActive: true },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, isActive: true },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimalPlaces: 2, isActive: true },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, isActive: true },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, isActive: true },
  ]);
  console.log(`Created ${currencies.length} currencies`);

  // ============================================
  // SEED FX RATES (as of today)
  // ============================================
  const today = new Date();
  const fxRates = await FxRate.insertMany([
    { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'AED', rate: 3.67, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'SAR', rate: 3.75, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'JPY', rate: 149.50, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'CHF', rate: 0.88, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'EUR', toCurrency: 'GBP', rate: 0.86, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'EUR', toCurrency: 'CHF', rate: 0.96, effectiveDate: today, source: 'manual' },
  ]);
  console.log(`Created ${fxRates.length} FX rates`);

  // ============================================
  // SEED FEE CONFIGURATIONS
  // ============================================
  const feeConfigs = await FeeConfig.insertMany([
    // === PERCENTAGE-BASED FEES ===
    {
      code: 'ARR',
      name: 'Arrangement Fee',
      type: 'arrangement',
      calculationType: 'percentage',
      defaultRate: 0.01, // 1%
      defaultBasisAmount: 'principal',
      isRequired: true,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 1,
      isActive: true,
    },
    {
      code: 'COMM',
      name: 'Commitment Fee',
      type: 'commitment',
      calculationType: 'percentage',
      defaultRate: 0.005, // 0.5%
      defaultBasisAmount: 'principal',
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 2,
      isActive: true,
    },
    {
      code: 'UTIL',
      name: 'Utilization Fee',
      type: 'facility',
      calculationType: 'percentage',
      defaultRate: 0.0025, // 0.25%
      defaultBasisAmount: 'outstanding',
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 3,
      isActive: true,
    },
    {
      code: 'MGMT',
      name: 'Management Fee',
      type: 'custom',
      calculationType: 'percentage',
      defaultRate: 0.0075, // 0.75%
      defaultBasisAmount: 'principal',
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 4,
      isActive: true,
    },
    {
      code: 'LATE',
      name: 'Late Payment Fee',
      type: 'late_payment',
      calculationType: 'percentage',
      defaultRate: 0.02, // 2%
      defaultBasisAmount: 'outstanding',
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 4,
      isActive: true,
    },
    // === FLAT FEES ===
    {
      code: 'DOC',
      name: 'Documentation Fee',
      type: 'custom',
      calculationType: 'flat',
      defaultFlatAmount: 2500,
      isRequired: true,
      isEditable: false,
      applicableCurrencies: [],
      sortOrder: 10,
      isActive: true,
    },
    {
      code: 'FAC',
      name: 'Facility Fee',
      type: 'facility',
      calculationType: 'flat',
      defaultFlatAmount: 5000,
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 11,
      isActive: true,
    },
    {
      code: 'LEGAL',
      name: 'Legal Fee',
      type: 'custom',
      calculationType: 'flat',
      defaultFlatAmount: 3500,
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 12,
      isActive: true,
    },
    {
      code: 'AMEND',
      name: 'Amendment Fee',
      type: 'custom',
      calculationType: 'flat',
      defaultFlatAmount: 1500,
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 13,
      isActive: true,
    },
    {
      code: 'WIRE',
      name: 'Wire Transfer Fee',
      type: 'custom',
      calculationType: 'flat',
      defaultFlatAmount: 50,
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 14,
      isActive: true,
    },
    {
      code: 'AUDIT',
      name: 'Audit Fee',
      type: 'custom',
      calculationType: 'flat',
      defaultFlatAmount: 7500,
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 15,
      isActive: true,
    },
    // === TIERED FEES ===
    {
      code: 'TIER',
      name: 'Tiered Processing Fee',
      type: 'custom',
      calculationType: 'tiered',
      defaultBasisAmount: 'principal',
      defaultTiers: [
        { minAmount: 0, maxAmount: 100000, rate: 0.015 },      // 1.5% for first 100k
        { minAmount: 100000, maxAmount: 500000, rate: 0.01 },  // 1% for 100k-500k
        { minAmount: 500000, maxAmount: null, rate: 0.005 },   // 0.5% above 500k
      ],
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 20,
      isActive: true,
    },
    {
      code: 'ADMIN',
      name: 'Admin Fee (Tiered)',
      type: 'custom',
      calculationType: 'tiered',
      defaultBasisAmount: 'principal',
      defaultTiers: [
        { minAmount: 0, maxAmount: 250000, rate: 0.008 },      // 0.8% for first 250k
        { minAmount: 250000, maxAmount: 1000000, rate: 0.005 }, // 0.5% for 250k-1M
        { minAmount: 1000000, maxAmount: null, rate: 0.003 },  // 0.3% above 1M
      ],
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 21,
      isActive: true,
    },
    {
      code: 'SYNDIC',
      name: 'Syndication Fee (Tiered)',
      type: 'custom',
      calculationType: 'tiered',
      defaultBasisAmount: 'principal',
      defaultTiers: [
        { minAmount: 0, maxAmount: 500000, rate: 0.02 },       // 2% for first 500k
        { minAmount: 500000, maxAmount: 2000000, rate: 0.015 }, // 1.5% for 500k-2M
        { minAmount: 2000000, maxAmount: 5000000, rate: 0.01 }, // 1% for 2M-5M
        { minAmount: 5000000, maxAmount: null, rate: 0.0075 }, // 0.75% above 5M
      ],
      isRequired: false,
      isEditable: true,
      applicableCurrencies: [],
      sortOrder: 22,
      isActive: true,
    },
  ]);
  console.log(`Created ${feeConfigs.length} fee configurations`);

  // ============================================
  // SEED SAMPLE LOANS WITH INVOICES AND FEES
  // ============================================
  const arrFee = feeConfigs.find(f => f.code === 'ARR')!;
  const commFee = feeConfigs.find(f => f.code === 'COMM')!;
  const facFee = feeConfigs.find(f => f.code === 'FAC')!;
  const docFee = feeConfigs.find(f => f.code === 'DOC')!;
  const tierFee = feeConfigs.find(f => f.code === 'TIER')!;

  // Helper to calculate dates relative to today for maturity buckets
  const daysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  const loansData = [
    // ACME - Multiple loans with VARIED MATURITY DATES for testing MaturityOverview
    // Overdue loan (-10 days)
    {
      loanNumber: 'TF-2024-001',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 500000,
      currency: 'USD',
      status: 'approved',
      pricingStatus: 'priced',
      startDate: daysFromNow(-180),
      maturityDate: daysFromNow(-10), // OVERDUE
      pricing: {
        baseRate: 0.055, // 5.5% SOFR
        spread: 0.02,    // 2% spread
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-001', buyerName: 'Global Imports Ltd', amount: 150000, currency: 'USD', issueDate: daysFromNow(-180), dueDate: daysFromNow(-10), status: 'financed' },
        { invoiceNumber: 'INV-002', buyerName: 'Pacific Trade Corp', amount: 200000, currency: 'USD', issueDate: daysFromNow(-175), dueDate: daysFromNow(-5), status: 'financed' },
        { invoiceNumber: 'INV-003', buyerName: 'Eastern Supplies Inc', amount: 150000, currency: 'USD', issueDate: daysFromNow(-170), dueDate: daysFromNow(-2), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 2500, currency: 'USD' },
      ],
    },
    // This week loan (5 days)
    {
      loanNumber: 'TF-2024-006',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 750000,
      currency: 'USD',
      status: 'funded',
      pricingStatus: 'priced',
      startDate: daysFromNow(-120),
      maturityDate: daysFromNow(5), // THIS WEEK
      pricing: {
        baseRate: 0.0575,
        spread: 0.0225,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-010', buyerName: 'West Coast Distributors', amount: 400000, currency: 'USD', issueDate: daysFromNow(-120), dueDate: daysFromNow(3), status: 'pending' },
        { invoiceNumber: 'INV-011', buyerName: 'Midwest Suppliers', amount: 350000, currency: 'USD', issueDate: daysFromNow(-115), dueDate: daysFromNow(5), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: tierFee._id.toString(), code: 'TIER', type: 'custom', name: 'Tiered Processing Fee', calculationType: 'tiered', basisAmount: 'principal', tiers: [
          { minAmount: 0, maxAmount: 100000, rate: 0.015 },
          { minAmount: 100000, maxAmount: 500000, rate: 0.01 },
          { minAmount: 500000, maxAmount: null, rate: 0.005 },
        ], currency: 'USD' },
      ],
    },
    // This month loan (20 days)
    {
      loanNumber: 'TF-2024-007',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 300000,
      currency: 'USD',
      status: 'approved',
      pricingStatus: 'priced',
      startDate: daysFromNow(-90),
      maturityDate: daysFromNow(20), // THIS MONTH
      pricing: {
        baseRate: 0.055,
        spread: 0.02,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-012', buyerName: 'Northern Industries', amount: 300000, currency: 'USD', issueDate: daysFromNow(-90), dueDate: daysFromNow(20), status: 'financed' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'USD' },
      ],
    },
    // Next month loan (45 days)
    {
      loanNumber: 'TF-2024-008',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 450000,
      currency: 'USD',
      status: 'in_review',
      pricingStatus: 'pending',
      startDate: daysFromNow(-60),
      maturityDate: daysFromNow(45), // NEXT MONTH
      pricing: {
        baseRate: 0.0525,
        spread: 0.0175,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-013', buyerName: 'Southern Exports', amount: 225000, currency: 'USD', issueDate: daysFromNow(-60), dueDate: daysFromNow(40), status: 'pending' },
        { invoiceNumber: 'INV-014', buyerName: 'Coastal Trading', amount: 225000, currency: 'USD', issueDate: daysFromNow(-55), dueDate: daysFromNow(45), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.0125, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 2500, currency: 'USD' },
      ],
    },
    // Next quarter loan (75 days)
    {
      loanNumber: 'TF-2024-009',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 600000,
      currency: 'USD',
      status: 'approved',
      pricingStatus: 'priced',
      startDate: daysFromNow(-30),
      maturityDate: daysFromNow(75), // NEXT QUARTER
      pricing: {
        baseRate: 0.055,
        spread: 0.0225,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-015', buyerName: 'Central Imports', amount: 350000, currency: 'USD', issueDate: daysFromNow(-30), dueDate: daysFromNow(70), status: 'financed' },
        { invoiceNumber: 'INV-016', buyerName: 'Mountain Traders', amount: 250000, currency: 'USD', issueDate: daysFromNow(-25), dueDate: daysFromNow(75), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: commFee._id.toString(), code: 'COMM', type: 'commitment', name: 'Commitment Fee', calculationType: 'percentage', rate: 0.005, basisAmount: 'principal', currency: 'USD' },
      ],
    },
    // Later loan (120 days)
    {
      loanNumber: 'TF-2024-010',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 850000,
      currency: 'USD',
      status: 'draft',
      pricingStatus: 'pending',
      startDate: daysFromNow(-15),
      maturityDate: daysFromNow(120), // LATER (90+ days)
      pricing: {
        baseRate: 0.0575,
        spread: 0.025,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'INV-017', buyerName: 'Valley Corporation', amount: 500000, currency: 'USD', issueDate: daysFromNow(-15), dueDate: daysFromNow(100), status: 'pending' },
        { invoiceNumber: 'INV-018', buyerName: 'Summit Industries', amount: 350000, currency: 'USD', issueDate: daysFromNow(-10), dueDate: daysFromNow(120), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: tierFee._id.toString(), code: 'TIER', type: 'custom', name: 'Tiered Processing Fee', calculationType: 'tiered', basisAmount: 'principal', tiers: [
          { minAmount: 0, maxAmount: 100000, rate: 0.015 },
          { minAmount: 100000, maxAmount: 500000, rate: 0.01 },
          { minAmount: 500000, maxAmount: null, rate: 0.005 },
        ], currency: 'USD' },
      ],
    },
    // EUR loan for ACME - Later (150 days)
    {
      loanNumber: 'TF-2024-011',
      customerId: acme._id,
      borrowerId: acme.code,
      borrowerName: acme.name,
      totalAmount: 400000,
      currency: 'EUR',
      status: 'approved',
      pricingStatus: 'priced',
      startDate: daysFromNow(-20),
      maturityDate: daysFromNow(150), // LATER
      pricing: {
        baseRate: 0.04,
        spread: 0.02,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'EUR-INV-010', buyerName: 'Berlin Trading GmbH', amount: 250000, currency: 'EUR', issueDate: daysFromNow(-20), dueDate: daysFromNow(140), status: 'pending' },
        { invoiceNumber: 'EUR-INV-011', buyerName: 'Munich Exports AG', amount: 150000, currency: 'EUR', issueDate: daysFromNow(-15), dueDate: daysFromNow(150), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.0125, basisAmount: 'principal', currency: 'EUR' },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 2000, currency: 'EUR' },
      ],
    },
    // EUROTRADE
    {
      loanNumber: 'TF-2024-002',
      customerId: euroTrade._id,
      borrowerId: euroTrade.code,
      borrowerName: euroTrade.name,
      totalAmount: 750000,
      currency: 'EUR',
      status: 'in_review',
      pricingStatus: 'pending',
      startDate: new Date('2024-02-01'),
      maturityDate: new Date('2024-08-01'),
      pricing: {
        baseRate: 0.04,  // 4% EURIBOR
        spread: 0.025,   // 2.5% spread
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'EUR-INV-001', buyerName: 'Deutsche Handel AG', amount: 300000, currency: 'EUR', issueDate: new Date('2024-01-28'), dueDate: new Date('2024-05-28'), status: 'pending' },
        { invoiceNumber: 'EUR-INV-002', buyerName: 'French Imports SARL', amount: 250000, currency: 'EUR', issueDate: new Date('2024-01-30'), dueDate: new Date('2024-06-30'), status: 'pending' },
        { invoiceNumber: 'EUR-INV-003', buyerName: 'Italian Trade SpA', amount: 200000, currency: 'EUR', issueDate: new Date('2024-02-01'), dueDate: new Date('2024-07-01'), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.0125, basisAmount: 'principal', currency: 'EUR', isOverridden: true },
        { feeConfigId: commFee._id.toString(), code: 'COMM', type: 'commitment', name: 'Commitment Fee', calculationType: 'percentage', rate: 0.005, basisAmount: 'principal', currency: 'EUR' },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 2000, currency: 'EUR' },
      ],
    },
    // GULF
    {
      loanNumber: 'TF-2024-003',
      customerId: gulf._id,
      borrowerId: gulf.code,
      borrowerName: gulf.name,
      totalAmount: 2000000,
      currency: 'AED',
      status: 'draft',
      pricingStatus: 'pending',
      startDate: new Date('2024-03-01'),
      maturityDate: new Date('2024-12-01'),
      pricing: {
        baseRate: 0.06,  // 6% EIBOR
        spread: 0.03,    // 3% spread
        dayCountConvention: 'actual/365',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'AED-INV-001', buyerName: 'Dubai Imports FZE', amount: 500000, currency: 'AED', issueDate: new Date('2024-02-25'), dueDate: new Date('2024-08-25'), status: 'pending' },
        { invoiceNumber: 'AED-INV-002', buyerName: 'Abu Dhabi Trade Co', amount: 750000, currency: 'AED', issueDate: new Date('2024-02-27'), dueDate: new Date('2024-09-27'), status: 'pending' },
        { invoiceNumber: 'AED-INV-003', buyerName: 'Sharjah Exports LLC', amount: 750000, currency: 'AED', issueDate: new Date('2024-03-01'), dueDate: new Date('2024-11-01'), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.015, basisAmount: 'principal', currency: 'AED', isOverridden: true },
        { feeConfigId: tierFee._id.toString(), code: 'TIER', type: 'custom', name: 'Tiered Processing Fee', calculationType: 'tiered', basisAmount: 'principal', tiers: [
          { minAmount: 0, maxAmount: 100000, rate: 0.015 },
          { minAmount: 100000, maxAmount: 500000, rate: 0.01 },
          { minAmount: 500000, maxAmount: null, rate: 0.005 },
        ], currency: 'AED' },
        { feeConfigId: facFee._id.toString(), code: 'FAC', type: 'facility', name: 'Facility Fee', calculationType: 'flat', flatAmount: 15000, currency: 'AED', isOverridden: true },
      ],
    },
    {
      loanNumber: 'TF-2024-004',
      customerId: britex._id,
      borrowerId: britex.code,
      borrowerName: britex.name,
      totalAmount: 350000,
      currency: 'GBP',
      status: 'funded',
      pricingStatus: 'locked',
      startDate: new Date('2023-12-01'),
      maturityDate: new Date('2024-06-01'),
      pricing: {
        baseRate: 0.0525, // 5.25% SONIA
        spread: 0.0175,   // 1.75% spread
        dayCountConvention: 'actual/365',
        accrualMethod: 'simple',
      },
      invoices: [
        { invoiceNumber: 'GBP-INV-001', buyerName: 'London Traders PLC', amount: 175000, currency: 'GBP', issueDate: new Date('2023-11-25'), dueDate: new Date('2024-03-25'), status: 'collected' },
        { invoiceNumber: 'GBP-INV-002', buyerName: 'Manchester Imports Ltd', amount: 175000, currency: 'GBP', issueDate: new Date('2023-11-28'), dueDate: new Date('2024-05-28'), status: 'financed' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.01, basisAmount: 'principal', currency: 'GBP', isPaid: true },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 1500, currency: 'GBP', isPaid: true },
      ],
    },
    {
      loanNumber: 'TF-2024-005',
      customerId: multiTrade._id,
      borrowerId: multiTrade.code,
      borrowerName: multiTrade.name,
      totalAmount: 1000000,
      currency: 'USD',
      status: 'approved',
      pricingStatus: 'priced',
      startDate: new Date('2024-02-15'),
      maturityDate: new Date('2024-08-15'),
      pricing: {
        baseRate: 0.055,
        spread: 0.0225,
        dayCountConvention: 'actual/360',
        accrualMethod: 'simple',
      },
      // Multi-currency invoices - will be converted to USD
      invoices: [
        { invoiceNumber: 'MC-INV-001', buyerName: 'US Buyer Corp', amount: 300000, currency: 'USD', issueDate: new Date('2024-02-10'), dueDate: new Date('2024-06-10'), status: 'financed' },
        { invoiceNumber: 'MC-INV-002', buyerName: 'European Buyer GmbH', amount: 250000, currency: 'EUR', issueDate: new Date('2024-02-12'), dueDate: new Date('2024-07-12'), status: 'pending' },
        { invoiceNumber: 'MC-INV-003', buyerName: 'UK Buyer Ltd', amount: 150000, currency: 'GBP', issueDate: new Date('2024-02-14'), dueDate: new Date('2024-08-14'), status: 'pending' },
      ],
      fees: [
        { feeConfigId: arrFee._id.toString(), code: 'ARR', type: 'arrangement', name: 'Arrangement Fee', calculationType: 'percentage', rate: 0.0125, basisAmount: 'principal', currency: 'USD' },
        { feeConfigId: commFee._id.toString(), code: 'COMM', type: 'commitment', name: 'Commitment Fee', calculationType: 'percentage', rate: 0.0075, basisAmount: 'principal', currency: 'USD', isOverridden: true },
        { feeConfigId: facFee._id.toString(), code: 'FAC', type: 'facility', name: 'Facility Fee', calculationType: 'flat', flatAmount: 7500, currency: 'USD', isOverridden: true },
        { feeConfigId: docFee._id.toString(), code: 'DOC', type: 'custom', name: 'Documentation Fee', calculationType: 'flat', flatAmount: 3500, currency: 'USD', isOverridden: true },
      ],
    },
  ];

  // Create loans and calculate all derived fields
  for (const loanData of loansData) {
    const loan = new Loan({
      ...loanData,
      outstandingAmount: loanData.totalAmount,
      createdBy: 'seed',
      updatedBy: 'seed',
      pricing: {
        ...loanData.pricing,
        effectiveRate: 0, // Will be calculated
      },
      totalFees: 0,
      totalInvoiceAmount: 0,
      netProceeds: 0,
      interestAmount: 0,
      fees: (loanData.fees as SeedFee[]).map(fee => ({
        ...fee,
        calculatedAmount: 0,
        isPaid: fee.isPaid ?? false,
        isWaived: false,
        isOverridden: fee.isOverridden ?? false,
      })),
    });

    // Run all calculations
    await recalculateLoan(loan);
    await loan.save();

    console.log(`Created loan ${loan.loanNumber}:`);
    console.log(`  - Effective Rate: ${(loan.pricing.effectiveRate * 100).toFixed(2)}%`);
    console.log(`  - Total Amount: ${loan.currency} ${loan.totalAmount.toLocaleString()}`);
    console.log(`  - Total Fees: ${loan.currency} ${loan.totalFees.toLocaleString()}`);
    console.log(`  - Interest Amount: ${loan.currency} ${loan.interestAmount.toLocaleString()}`);
    console.log(`  - Net Proceeds: ${loan.currency} ${loan.netProceeds.toLocaleString()}`);
  }

  console.log('\nSeed completed successfully!');
  console.log(`Summary:`);
  console.log(`  - ${currencies.length} currencies`);
  console.log(`  - ${fxRates.length} FX rates`);
  console.log(`  - ${feeConfigs.length} fee configurations`);
  console.log(`  - ${loansData.length} loans`);

  await mongoose.connection.close();
  console.log('\nDisconnected from MongoDB');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
