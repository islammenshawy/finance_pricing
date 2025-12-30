import mongoose from 'mongoose';
import { Currency, FxRate, FeeConfig, Loan, Customer, Facility, Buyer } from '../models';
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
}

// Configuration
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'JPY'];
const LOANS_PER_FACILITY = 4; // 4 loans per facility, multiple facilities per customer

// Helper to generate random number in range
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// Generate random date within range
const randDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Credit ratings for buyers
const CREDIT_RATINGS: Array<'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B'> = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'];

// Customer definitions with industry groups
const CUSTOMER_DEFINITIONS = [
  {
    code: 'TECHGLOBAL',
    name: 'TechGlobal Industries',
    country: 'United States',
    industry: 'Technology',
    creditRating: 'AA',
    relationshipManager: 'Sarah Chen',
    currencies: ['USD', 'EUR', 'JPY'],
    programTypes: ['receivables_financing', 'receivables_financing', 'receivables_financing'],
  },
  {
    code: 'EURORETAIL',
    name: 'EuroRetail Group',
    country: 'Germany',
    industry: 'Retail',
    creditRating: 'A',
    relationshipManager: 'Hans Mueller',
    currencies: ['EUR', 'GBP'],
    programTypes: ['payables_financing', 'payables_financing'],
  },
  {
    code: 'ASIAMANUF',
    name: 'Asia Manufacturing Corp',
    country: 'Japan',
    industry: 'Manufacturing',
    creditRating: 'AA',
    relationshipManager: 'Yuki Tanaka',
    currencies: ['JPY', 'USD', 'AED'],
    programTypes: ['receivables_financing', 'inventory_financing', 'receivables_financing'],
  },
  {
    code: 'GULFTRADING',
    name: 'Gulf Trading Enterprises',
    country: 'UAE',
    industry: 'Trading',
    creditRating: 'BBB',
    relationshipManager: 'Ahmed Al-Hassan',
    currencies: ['AED', 'USD', 'EUR'],
    programTypes: ['distributor_financing', 'receivables_financing', 'payables_financing'],
  },
  {
    code: 'UKPHARMA',
    name: 'UK Pharma Solutions',
    country: 'United Kingdom',
    industry: 'Healthcare',
    creditRating: 'A',
    relationshipManager: 'James Wilson',
    currencies: ['GBP', 'EUR', 'USD'],
    programTypes: ['receivables_financing', 'receivables_financing', 'inventory_financing'],
  },
  {
    code: 'LATAMAG',
    name: 'LatAm Agricultural Holdings',
    country: 'Brazil',
    industry: 'Agriculture',
    creditRating: 'BBB',
    relationshipManager: 'Maria Santos',
    currencies: ['USD', 'EUR'],
    programTypes: ['receivables_financing', 'purchase_order_financing'],
  },
];

// Buyer companies pool
const BUYER_POOL = [
  { name: 'Global Imports Ltd', country: 'United Kingdom', industry: 'Retail' },
  { name: 'Pacific Trade Corp', country: 'Japan', industry: 'Manufacturing' },
  { name: 'Eastern Supplies Inc', country: 'China', industry: 'Electronics' },
  { name: 'Western Distributors', country: 'United States', industry: 'Distribution' },
  { name: 'Northern Logistics', country: 'Germany', industry: 'Logistics' },
  { name: 'Southern Exports', country: 'Brazil', industry: 'Agriculture' },
  { name: 'Central Trading Co', country: 'Singapore', industry: 'Trading' },
  { name: 'Atlantic Commerce', country: 'France', industry: 'Retail' },
  { name: 'Continental Partners', country: 'Netherlands', industry: 'Trading' },
  { name: 'Maritime Traders', country: 'UAE', industry: 'Shipping' },
  { name: 'Industrial Solutions', country: 'India', industry: 'Manufacturing' },
  { name: 'Tech Imports Inc', country: 'South Korea', industry: 'Technology' },
  { name: 'Metro Supplies', country: 'Australia', industry: 'Retail' },
  { name: 'Regional Distributors', country: 'Canada', industry: 'Distribution' },
  { name: 'National Trading', country: 'Mexico', industry: 'Trading' },
  { name: 'International Goods Co', country: 'Switzerland', industry: 'Trading' },
  { name: 'Premier Imports', country: 'Italy', industry: 'Fashion' },
  { name: 'Elite Trading', country: 'Hong Kong', industry: 'Finance' },
  { name: 'Prime Distributors', country: 'Spain', industry: 'Distribution' },
  { name: 'Select Commerce', country: 'Sweden', industry: 'Retail' },
  { name: 'Nordic Wholesale', country: 'Norway', industry: 'Wholesale' },
  { name: 'Baltic Traders', country: 'Poland', industry: 'Trading' },
  { name: 'Alpine Industries', country: 'Austria', industry: 'Manufacturing' },
  { name: 'Mediterranean Corp', country: 'Greece', industry: 'Shipping' },
  { name: 'Scandinavia Retail', country: 'Denmark', industry: 'Retail' },
];

async function seedHeavy() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Starting heavy seed...');

  // Clear existing data
  await Promise.all([
    Currency.deleteMany({}),
    FxRate.deleteMany({}),
    FeeConfig.deleteMany({}),
    Loan.deleteMany({}),
    Customer.deleteMany({}),
    Facility.deleteMany({}),
    Buyer.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ============================================
  // SEED CURRENCIES
  // ============================================
  const currencies = await Currency.insertMany([
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, isActive: true },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, isActive: true },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, isActive: true },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, isActive: true },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, isActive: true },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, isActive: true },
  ]);
  console.log(`Created ${currencies.length} currencies`);

  // ============================================
  // SEED FX RATES
  // ============================================
  const today = new Date();
  await FxRate.insertMany([
    { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'AED', rate: 3.67, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'JPY', rate: 149.50, effectiveDate: today, source: 'manual' },
    { fromCurrency: 'USD', toCurrency: 'CHF', rate: 0.88, effectiveDate: today, source: 'manual' },
  ]);
  console.log('Created FX rates');

  // ============================================
  // SEED FEE CONFIGURATIONS (with levels)
  // ============================================
  const feeConfigs = await FeeConfig.insertMany([
    // Customer-level fees
    {
      code: 'ONBOARD', name: 'Onboarding Fee', type: 'custom',
      applicableLevel: 'customer', frequency: 'one_time',
      calculationType: 'flat', defaultFlatAmount: 5000,
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 1, isActive: true,
    },
    {
      code: 'ANNUAL', name: 'Annual Review Fee', type: 'custom',
      applicableLevel: 'customer', frequency: 'annually',
      calculationType: 'flat', defaultFlatAmount: 2500,
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 2, isActive: true,
    },
    // Facility-level fees
    {
      code: 'COMMIT', name: 'Commitment Fee', type: 'commitment',
      applicableLevel: 'facility', frequency: 'annually',
      calculationType: 'percentage', defaultRate: 0.005, defaultBasisAmount: 'principal',
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 3, isActive: true,
    },
    {
      code: 'UNUSED', name: 'Unused Line Fee', type: 'facility',
      applicableLevel: 'facility', frequency: 'quarterly',
      calculationType: 'percentage', defaultRate: 0.0025, defaultBasisAmount: 'principal',
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 4, isActive: true,
    },
    // Loan-level fees
    {
      code: 'ARR', name: 'Arrangement Fee', type: 'arrangement',
      applicableLevel: 'loan', frequency: 'one_time',
      calculationType: 'percentage', defaultRate: 0.01, defaultBasisAmount: 'principal',
      isRequired: true, isEditable: true, applicableCurrencies: [], sortOrder: 5, isActive: true,
    },
    {
      code: 'DOC', name: 'Documentation Fee', type: 'custom',
      applicableLevel: 'loan', frequency: 'one_time',
      calculationType: 'flat', defaultFlatAmount: 2500,
      isRequired: true, isEditable: false, applicableCurrencies: [], sortOrder: 6, isActive: true,
    },
    {
      code: 'FAC', name: 'Facility Fee', type: 'facility',
      applicableLevel: 'loan', frequency: 'one_time',
      calculationType: 'flat', defaultFlatAmount: 5000,
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 7, isActive: true,
    },
    {
      code: 'TIER', name: 'Tiered Processing Fee', type: 'custom',
      applicableLevel: 'loan', frequency: 'one_time',
      calculationType: 'tiered', defaultBasisAmount: 'principal',
      defaultTiers: [
        { minAmount: 0, maxAmount: 100000, rate: 0.015 },
        { minAmount: 100000, maxAmount: 500000, rate: 0.01 },
        { minAmount: 500000, maxAmount: null, rate: 0.005 },
      ],
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 8, isActive: true,
    },
    // Invoice-level fees
    {
      code: 'VERIFY', name: 'Invoice Verification Fee', type: 'custom',
      applicableLevel: 'invoice', frequency: 'per_transaction',
      calculationType: 'flat', defaultFlatAmount: 25,
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 9, isActive: true,
    },
    {
      code: 'WIRE', name: 'Wire Transfer Fee', type: 'custom',
      applicableLevel: 'invoice', frequency: 'per_transaction',
      calculationType: 'flat', defaultFlatAmount: 50,
      isRequired: false, isEditable: true, applicableCurrencies: [], sortOrder: 10, isActive: true,
    },
  ]);
  console.log(`Created ${feeConfigs.length} fee configurations`);

  const arrFee = feeConfigs.find(f => f.code === 'ARR')!;
  const docFee = feeConfigs.find(f => f.code === 'DOC')!;
  const facFee = feeConfigs.find(f => f.code === 'FAC')!;
  const tierFee = feeConfigs.find(f => f.code === 'TIER')!;
  const wireFee = feeConfigs.find(f => f.code === 'WIRE')!;

  // Base rates by currency
  const baseRates: Record<string, number> = {
    USD: 0.055,
    EUR: 0.04,
    GBP: 0.0525,
    AED: 0.06,
    JPY: 0.001,
  };

  // Amount multipliers by currency
  const amountMultipliers: Record<string, number> = {
    USD: 1,
    EUR: 1,
    GBP: 1,
    AED: 3.67,
    JPY: 150,
  };

  const statuses = ['draft', 'in_review', 'approved', 'funded'];
  const pricingStatuses = ['pending', 'priced', 'locked'];

  let loanCounter = 1;
  let totalLoans = 0;
  let totalFacilities = 0;
  let totalBuyers = 0;
  const allBuyers: any[] = [];

  // ============================================
  // CREATE CUSTOMERS, FACILITIES, BUYERS, AND LOANS
  // ============================================
  for (const customerDef of CUSTOMER_DEFINITIONS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Creating ${customerDef.name} (${customerDef.industry})`);
    console.log(`${'='.repeat(50)}`);

    // Create customer
    const customer = await Customer.create({
      code: customerDef.code,
      name: customerDef.name,
      country: customerDef.country,
      industry: customerDef.industry,
      creditRating: customerDef.creditRating,
      relationshipManager: customerDef.relationshipManager,
      isActive: true,
    });

    // Create buyers for this customer (5-8 buyers each)
    const buyerCount = rand(5, 8);
    const customerBuyers: any[] = [];
    const usedBuyerIndices = new Set<number>();

    for (let i = 0; i < buyerCount; i++) {
      // Pick a random unused buyer from the pool
      let buyerIndex: number;
      do {
        buyerIndex = rand(0, BUYER_POOL.length - 1);
      } while (usedBuyerIndices.has(buyerIndex));
      usedBuyerIndices.add(buyerIndex);

      const buyerTemplate = BUYER_POOL[buyerIndex];
      const rating = CREDIT_RATINGS[rand(0, CREDIT_RATINGS.length - 1)];
      const approvedLimit = rand(500000, 5000000);

      const buyer = await Buyer.create({
        code: `${customerDef.code}-${buyerTemplate.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)}`,
        name: buyerTemplate.name,
        customerId: customer._id,
        country: buyerTemplate.country,
        industry: buyerTemplate.industry,
        creditRating: rating,
        internalRating: `${rand(1, 5)}-${['Low', 'Medium', 'High'][rand(0, 2)]}`,
        ratingDate: randDate(new Date('2023-01-01'), new Date('2024-06-01')),
        ratingSource: ['S&P', 'Moody\'s', 'Internal', 'Fitch'][rand(0, 3)],
        approvedLimit,
        currentExposure: 0,
        availableLimit: approvedLimit,
        currency: 'USD',
        concentrationLimit: randFloat(0.15, 0.30),
        currentConcentration: 0,
        averagePaymentDays: rand(25, 60),
        paymentTerms: [30, 45, 60, 90][rand(0, 3)],
        historicalDilution: randFloat(0.01, 0.08),
        status: 'approved',
        approvedBy: 'Credit Committee',
        approvedAt: randDate(new Date('2023-01-01'), new Date('2024-01-01')),
        createdBy: 'seed',
        updatedBy: 'seed',
      });
      customerBuyers.push(buyer);
      allBuyers.push(buyer);
    }
    totalBuyers += customerBuyers.length;
    console.log(`  Created ${customerBuyers.length} buyers`);

    // Create facilities for each currency this customer uses
    for (let facIdx = 0; facIdx < customerDef.currencies.length; facIdx++) {
      const currency = customerDef.currencies[facIdx];
      const programType = customerDef.programTypes[facIdx];

      // Credit limit based on currency
      const baseCreditLimit = rand(5000000, 15000000);
      const creditLimit = Math.round(baseCreditLimit * amountMultipliers[currency]);

      const facility = await Facility.create({
        facilityNumber: `FAC-${customerDef.code}-${currency}-${String(facIdx + 1).padStart(2, '0')}`,
        customerId: customer._id,
        name: `${customerDef.name} ${currency} ${programType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        programType,
        recourseType: ['full_recourse', 'limited_recourse', 'non_recourse'][rand(0, 2)],
        creditLimit,
        availableAmount: creditLimit,
        utilizedAmount: 0,
        currency,
        defaultAdvanceRate: randFloat(0.80, 0.90),
        maxAdvanceRate: 0.95,
        minAdvanceRate: 0.70,
        dilutionReserveRate: randFloat(0.03, 0.08),
        concentrationLimit: 0.25,
        maxTenorDays: [90, 120, 180][rand(0, 2)],
        insuranceRequired: Math.random() > 0.5,
        insuranceProvider: Math.random() > 0.5 ? ['Euler Hermes', 'Coface', 'Atradius'][rand(0, 2)] : undefined,
        insuranceCoverage: Math.random() > 0.5 ? 0.90 : undefined,
        defaultBaseRate: currency === 'JPY' ? 0.001 : randFloat(0.04, 0.06),
        defaultSpread: randFloat(0.015, 0.030),
        dayCountConvention: currency === 'GBP' || currency === 'AED' ? 'actual/365' : 'actual/360',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-12-31'),
        status: 'active',
        approvedBy: 'Credit Committee',
        approvedAt: new Date('2023-12-15'),
        covenants: [
          'Minimum tangible net worth requirement',
          'Debt-to-equity ratio covenant',
          'No change of control without consent',
        ],
        createdBy: 'seed',
        updatedBy: 'seed',
      });
      totalFacilities++;

      console.log(`  Creating ${LOANS_PER_FACILITY} loans for ${facility.facilityNumber}...`);

      // Create loans for this facility
      for (let loanIdx = 0; loanIdx < LOANS_PER_FACILITY; loanIdx++) {
        const loanNumber = `TF-2024-${String(loanCounter++).padStart(3, '0')}`;

        // Random amount based on currency
        const baseAmount = rand(100000, 1500000);
        const totalAmount = Math.round(baseAmount * amountMultipliers[currency]);

        // Trade finance parameters
        const advanceRate = randFloat(facility.minAdvanceRate, facility.maxAdvanceRate);
        const advanceAmount = Math.round(totalAmount * advanceRate);
        const holdbackRate = 1 - advanceRate;
        const holdbackAmount = totalAmount - advanceAmount;
        const dilutionReserveRate = facility.dilutionReserveRate;
        const dilutionReserve = Math.round(advanceAmount * dilutionReserveRate);

        // Dates
        const startDate = randDate(new Date('2024-01-01'), new Date('2024-06-01'));
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + rand(3, 12));

        // Rates
        const baseRateVariance = currency === 'JPY' ? randFloat(0, 0.002) : randFloat(-0.005, 0.01);
        const baseRate = Math.max(0.001, baseRates[currency] + baseRateVariance);
        const spread = randFloat(0.015, 0.035);

        // Status
        const status = statuses[rand(0, statuses.length - 1)];
        const pricingStatus = status === 'funded' ? 'locked' :
                             status === 'approved' ? pricingStatuses[rand(0, 1)] :
                             'pending';

        // Generate invoices
        const invoiceCount = rand(2, 5);
        const invoices = [];
        let remainingAmount = totalAmount;

        for (let invIdx = 0; invIdx < invoiceCount; invIdx++) {
          const isLast = invIdx === invoiceCount - 1;
          const invoiceAmount = isLast ? remainingAmount : Math.round(remainingAmount * randFloat(0.2, 0.4));
          remainingAmount -= invoiceAmount;

          const buyer = customerBuyers[rand(0, customerBuyers.length - 1)];
          const invoiceDate = randDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000), startDate);
          const dueDate = new Date(invoiceDate);
          dueDate.setMonth(dueDate.getMonth() + rand(2, 6));

          const verificationStatus = status === 'draft' ? 'pending' :
                                     status === 'in_review' ? (Math.random() > 0.3 ? 'verified' : 'pending') :
                                     'verified';

          invoices.push({
            invoiceNumber: `${customerDef.code}-${currency}-INV-${loanCounter}-${invIdx + 1}`,
            buyerId: buyer._id,
            buyerName: buyer.name,
            amount: invoiceAmount,
            currency: currency,
            issueDate: invoiceDate,
            dueDate: dueDate,
            status: status === 'funded' ? 'financed' : 'pending',
            verificationStatus,
            verificationDate: verificationStatus === 'verified' ? randDate(invoiceDate, startDate) : undefined,
            verifiedBy: verificationStatus === 'verified' ? 'Operations Team' : undefined,
            disputeStatus: 'none',
            disputeAmount: 0,
            dilutionAmount: 0,
          });
        }

        // Generate fees
        const fees: SeedFee[] = [
          {
            feeConfigId: arrFee._id.toString(),
            code: 'ARR',
            type: 'arrangement',
            name: 'Arrangement Fee',
            calculationType: 'percentage',
            rate: randFloat(0.008, 0.015),
            basisAmount: 'principal',
            currency: currency,
            isOverridden: Math.random() > 0.5,
          },
          {
            feeConfigId: docFee._id.toString(),
            code: 'DOC',
            type: 'custom',
            name: 'Documentation Fee',
            calculationType: 'flat',
            flatAmount: Math.round(2500 * amountMultipliers[currency] * randFloat(0.8, 1.2)),
            currency: currency,
          },
        ];

        if (Math.random() > 0.6) {
          fees.push({
            feeConfigId: facFee._id.toString(),
            code: 'FAC',
            type: 'facility',
            name: 'Facility Fee',
            calculationType: 'flat',
            flatAmount: Math.round(5000 * amountMultipliers[currency] * randFloat(0.8, 1.5)),
            currency: currency,
            isOverridden: true,
          });
        }

        if (totalAmount > 500000 * amountMultipliers[currency] && Math.random() > 0.4) {
          fees.push({
            feeConfigId: tierFee._id.toString(),
            code: 'TIER',
            type: 'custom',
            name: 'Tiered Processing Fee',
            calculationType: 'tiered',
            basisAmount: 'principal',
            tiers: [
              { minAmount: 0, maxAmount: 100000, rate: 0.015 },
              { minAmount: 100000, maxAmount: 500000, rate: 0.01 },
              { minAmount: 500000, maxAmount: null, rate: 0.005 },
            ],
            currency: currency,
          });
        }

        if (Math.random() > 0.7) {
          fees.push({
            feeConfigId: wireFee._id.toString(),
            code: 'WIRE',
            type: 'custom',
            name: 'Wire Transfer Fee',
            calculationType: 'flat',
            flatAmount: Math.round(50 * amountMultipliers[currency]),
            currency: currency,
          });
        }

        const recourseType = Math.random() > 0.7
          ? ['full_recourse', 'limited_recourse', 'non_recourse'][rand(0, 2)] as 'full_recourse' | 'limited_recourse' | 'non_recourse'
          : facility.recourseType;

        // Create loan
        const loan = new Loan({
          loanNumber,
          customerId: customer._id,
          facilityId: facility._id,
          borrowerId: customer.code,
          borrowerName: customer.name,
          totalAmount,
          outstandingAmount: totalAmount,
          currency,
          advanceRate,
          advanceAmount,
          holdbackAmount,
          holdbackRate,
          dilutionReserve,
          dilutionReserveRate,
          rebateOnCollection: 0,
          recourseType,
          status,
          pricingStatus,
          startDate,
          maturityDate,
          fundingDate: status === 'funded' ? startDate : undefined,
          pricing: {
            baseRate,
            spread,
            effectiveRate: 0,
            dayCountConvention: currency === 'GBP' || currency === 'AED' ? 'actual/365' : 'actual/360',
            accrualMethod: 'simple',
          },
          invoices,
          fees: fees.map(fee => ({
            ...fee,
            calculatedAmount: 0,
            isPaid: status === 'funded' && Math.random() > 0.3,
            isWaived: false,
            isOverridden: (fee as any).isOverridden ?? false,
          })),
          totalFees: 0,
          totalInvoiceAmount: 0,
          netProceeds: 0,
          interestAmount: 0,
          totalDilution: 0,
          collectedAmount: 0,
          createdBy: 'seed',
          updatedBy: 'seed',
        });

        await recalculateLoan(loan);
        await loan.save();
        totalLoans++;

        // Update facility utilization
        facility.utilizedAmount += advanceAmount;
        facility.availableAmount = facility.creditLimit - facility.utilizedAmount;
      }

      await facility.save();
      console.log(`    ✓ ${facility.facilityNumber}: ${LOANS_PER_FACILITY} loans (Utilization: ${((facility.utilizedAmount / facility.creditLimit) * 100).toFixed(1)}%)`);
    }
  }

  // ============================================
  // STRESS TEST CUSTOMER (500 loans)
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('Creating STRESS TEST customer with 500 loans...');
  console.log('='.repeat(60));

  const stressCustomer = await Customer.create({
    code: 'STRESSTEST',
    name: 'Stress Test Corporation',
    country: 'United States',
    industry: 'Testing',
    creditRating: 'AA',
    relationshipManager: 'Test Manager',
    isActive: true,
  });

  // Create buyers for stress test
  const stressBuyers = [];
  for (let i = 0; i < 20; i++) {
    const buyer = await Buyer.create({
      code: `STRESS-BUYER-${i + 1}`,
      name: `Stress Test Buyer ${i + 1}`,
      customerId: stressCustomer._id,
      country: ['United States', 'Germany', 'Japan', 'UK', 'UAE'][rand(0, 4)],
      industry: 'Testing',
      creditRating: CREDIT_RATINGS[rand(0, CREDIT_RATINGS.length - 1)],
      internalRating: `${rand(1, 5)}-Medium`,
      ratingDate: new Date(),
      ratingSource: 'Internal',
      approvedLimit: 10000000,
      currentExposure: 0,
      availableLimit: 10000000,
      currency: 'USD',
      concentrationLimit: 0.25,
      currentConcentration: 0,
      averagePaymentDays: 45,
      paymentTerms: 60,
      historicalDilution: 0.03,
      status: 'approved',
      approvedBy: 'Test',
      approvedAt: new Date(),
      createdBy: 'seed',
      updatedBy: 'seed',
    });
    stressBuyers.push(buyer);
  }
  totalBuyers += stressBuyers.length;

  // Create facilities for each currency
  const stressCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'JPY'];
  const loansPerCurrency = 100; // 5 currencies × 100 = 500 loans

  for (const currency of stressCurrencies) {
    const creditLimit = Math.round(50000000 * amountMultipliers[currency]);

    const facility = await Facility.create({
      facilityNumber: `FAC-STRESS-${currency}-01`,
      customerId: stressCustomer._id,
      name: `Stress Test ${currency} Facility`,
      programType: 'receivables_financing',
      recourseType: 'full_recourse',
      creditLimit,
      availableAmount: creditLimit,
      utilizedAmount: 0,
      currency,
      defaultAdvanceRate: 0.85,
      maxAdvanceRate: 0.95,
      minAdvanceRate: 0.70,
      dilutionReserveRate: 0.05,
      concentrationLimit: 0.25,
      maxTenorDays: 180,
      insuranceRequired: false,
      defaultBaseRate: baseRates[currency],
      defaultSpread: 0.02,
      dayCountConvention: currency === 'GBP' || currency === 'AED' ? 'actual/365' : 'actual/360',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-12-31'),
      status: 'active',
      approvedBy: 'Test',
      approvedAt: new Date(),
      covenants: [],
      createdBy: 'seed',
      updatedBy: 'seed',
    });
    totalFacilities++;

    console.log(`  Creating ${loansPerCurrency} ${currency} loans...`);

    for (let i = 0; i < loansPerCurrency; i++) {
      const loanNumber = `STRESS-${currency}-${String(i + 1).padStart(4, '0')}`;
      const baseAmount = rand(50000, 500000);
      const totalAmount = Math.round(baseAmount * amountMultipliers[currency]);

      const advanceRate = randFloat(0.80, 0.90);
      const advanceAmount = Math.round(totalAmount * advanceRate);
      const holdbackAmount = totalAmount - advanceAmount;
      const dilutionReserve = Math.round(advanceAmount * 0.05);

      const startDate = randDate(new Date('2024-01-01'), new Date('2024-10-01'));
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + rand(2, 8));

      const baseRate = Math.max(0.001, baseRates[currency] + randFloat(-0.005, 0.01));
      const spread = randFloat(0.01, 0.04);

      const status = statuses[rand(0, statuses.length - 1)];
      const pricingStatus = status === 'funded' ? 'locked' :
                           status === 'approved' ? pricingStatuses[rand(0, 1)] : 'pending';

      // Generate 1-3 invoices per loan
      const invoiceCount = rand(1, 3);
      const invoices = [];
      let remainingAmount = totalAmount;

      for (let invIdx = 0; invIdx < invoiceCount; invIdx++) {
        const isLast = invIdx === invoiceCount - 1;
        const invoiceAmount = isLast ? remainingAmount : Math.round(remainingAmount * randFloat(0.3, 0.5));
        remainingAmount -= invoiceAmount;

        const buyer = stressBuyers[rand(0, stressBuyers.length - 1)];
        const dueDate = new Date(maturityDate);

        invoices.push({
          invoiceNumber: `STRESS-${currency}-${i + 1}-INV-${invIdx + 1}`,
          buyerId: buyer._id,
          buyerName: buyer.name,
          amount: invoiceAmount,
          currency,
          issueDate: startDate,
          dueDate,
          status: status === 'funded' ? 'financed' : 'pending',
          verificationStatus: status === 'draft' ? 'pending' : 'verified',
          disputeStatus: 'none',
          disputeAmount: 0,
          dilutionAmount: 0,
        });
      }

      // Generate fees
      const fees = [
        {
          feeConfigId: arrFee._id.toString(),
          code: 'ARR',
          type: 'arrangement' as FeeType,
          name: 'Arrangement Fee',
          calculationType: 'percentage' as FeeCalculationType,
          rate: randFloat(0.008, 0.012),
          basisAmount: 'principal' as const,
          currency,
          calculatedAmount: 0,
          isPaid: false,
          isWaived: false,
          isOverridden: false,
        },
        {
          feeConfigId: docFee._id.toString(),
          code: 'DOC',
          type: 'custom' as FeeType,
          name: 'Documentation Fee',
          calculationType: 'flat' as FeeCalculationType,
          flatAmount: Math.round(1000 * amountMultipliers[currency]),
          currency,
          calculatedAmount: 0,
          isPaid: false,
          isWaived: false,
          isOverridden: false,
        },
      ];

      const loan = new Loan({
        loanNumber,
        customerId: stressCustomer._id,
        facilityId: facility._id,
        borrowerId: stressCustomer.code,
        borrowerName: stressCustomer.name,
        totalAmount,
        outstandingAmount: totalAmount,
        currency,
        advanceRate,
        advanceAmount,
        holdbackAmount,
        holdbackRate: 1 - advanceRate,
        dilutionReserve,
        dilutionReserveRate: 0.05,
        rebateOnCollection: 0,
        recourseType: 'full_recourse',
        status,
        pricingStatus,
        startDate,
        maturityDate,
        fundingDate: status === 'funded' ? startDate : undefined,
        pricing: {
          baseRate,
          spread,
          effectiveRate: 0,
          dayCountConvention: currency === 'GBP' || currency === 'AED' ? 'actual/365' : 'actual/360',
          accrualMethod: 'simple',
        },
        invoices,
        fees,
        totalFees: 0,
        totalInvoiceAmount: 0,
        netProceeds: 0,
        interestAmount: 0,
        totalDilution: 0,
        collectedAmount: 0,
        createdBy: 'seed',
        updatedBy: 'seed',
      });

      await recalculateLoan(loan);
      await loan.save();
      totalLoans++;

      // Progress indicator every 25 loans
      if ((i + 1) % 25 === 0) {
        console.log(`    ${i + 1}/${loansPerCurrency} ${currency} loans created...`);
      }
    }

    console.log(`  ✓ ${currency}: ${loansPerCurrency} loans created`);
  }

  console.log(`\n✓ Stress Test customer created with ${loansPerCurrency * stressCurrencies.length} loans`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('HEAVY SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Customers: ${CUSTOMER_DEFINITIONS.length}`);
  console.log(`  Buyers: ${totalBuyers}`);
  console.log(`  Facilities: ${totalFacilities}`);
  console.log(`  Loans: ${totalLoans}`);
  console.log('\nBreakdown by Customer:');

  for (const customerDef of CUSTOMER_DEFINITIONS) {
    const customerLoans = await Loan.countDocuments({ borrowerId: customerDef.code });
    const customerFacilities = await Facility.countDocuments({
      customerId: { $in: await Customer.find({ code: customerDef.code }).distinct('_id') }
    });
    console.log(`  ${customerDef.name} (${customerDef.industry})`);
    console.log(`    - ${customerFacilities} facilities, ${customerLoans} loans`);
    console.log(`    - Currencies: ${customerDef.currencies.join(', ')}`);
  }

  await mongoose.connection.close();
  console.log('\nDisconnected from MongoDB');
}

seedHeavy().catch((error) => {
  console.error('Heavy seed failed:', error);
  process.exit(1);
});
