/**
 * In-memory mock server for testing without MongoDB
 * Supports all CRUD operations with seeded data
 * Run with: npx tsx server/src/mock/mockServer.ts
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Load seed data
const dataDir = path.join(__dirname, 'data');

interface MockData {
  customers: any[];
  loans: any[];
  feeConfigs: any[];
  auditEntries: any[];
  snapshots: any[];
}

function loadData(): MockData {
  // Load snapshots if file exists, otherwise start empty
  let snapshots: any[] = [];
  const snapshotsPath = path.join(dataDir, 'snapshots.json');
  if (fs.existsSync(snapshotsPath)) {
    snapshots = JSON.parse(fs.readFileSync(snapshotsPath, 'utf-8'));
  }

  return {
    customers: JSON.parse(fs.readFileSync(path.join(dataDir, 'customers.json'), 'utf-8')),
    loans: JSON.parse(fs.readFileSync(path.join(dataDir, 'loans.json'), 'utf-8')),
    feeConfigs: JSON.parse(fs.readFileSync(path.join(dataDir, 'feeConfigs.json'), 'utf-8')),
    auditEntries: JSON.parse(fs.readFileSync(path.join(dataDir, 'auditEntries.json'), 'utf-8')),
    snapshots,
  };
}

let data = loadData();

// Helper to generate ObjectId-like string
function generateId(): string {
  return Math.random().toString(16).substring(2) + Date.now().toString(16);
}

// Helper to normalize MongoDB _id to id (recursively for nested arrays)
function normalizeId(doc: any): any {
  if (!doc) return doc;
  const normalized = { ...doc };
  if (normalized._id) {
    normalized.id = normalized._id.$oid || normalized._id.toString() || normalized._id;
    delete normalized._id;
  }
  // Recursively normalize nested arrays (fees, invoices, etc.)
  if (Array.isArray(normalized.fees)) {
    normalized.fees = normalized.fees.map(normalizeId);
  }
  if (Array.isArray(normalized.invoices)) {
    normalized.invoices = normalized.invoices.map(normalizeId);
  }
  return normalized;
}

function normalizeIds(docs: any[]): any[] {
  return docs.map(normalizeId);
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mongodb: 'mock' });
});

// ============================================
// CUSTOMERS
// ============================================
app.get('/api/customers', (_req: Request, res: Response) => {
  res.json(normalizeIds(data.customers));
});

app.get('/api/customers/:id', (req: Request, res: Response) => {
  const customerId = req.params.id;
  const customer = data.customers.find((c) =>
    (c._id?.$oid || c._id || c.id) === customerId
  );

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const loans = data.loans.filter((l) =>
    (l.customerId?.$oid || l.customerId || l.customer) === customerId
  );

  // Calculate totals by currency
  const totals: Record<string, any> = {};
  for (const loan of loans) {
    if (!totals[loan.currency]) {
      totals[loan.currency] = {
        totalAmount: 0,
        totalInterest: 0,
        totalFees: 0,
        netProceeds: 0,
        loanCount: 0,
      };
    }
    totals[loan.currency].totalAmount += loan.totalAmount || 0;
    totals[loan.currency].totalInterest += loan.interestAmount || 0;
    totals[loan.currency].totalFees += loan.totalFees || 0;
    totals[loan.currency].netProceeds += loan.netProceeds || 0;
    totals[loan.currency].loanCount++;
  }

  res.json({
    customer: normalizeId(customer),
    loans: normalizeIds(loans),
    totals,
  });
});

// ============================================
// LOANS
// ============================================
app.get('/api/loans', (req: Request, res: Response) => {
  let loans = [...data.loans];

  // Apply filters
  const { customerId, status, pricingStatus, page = '1', pageSize = '50' } = req.query;

  if (customerId) {
    loans = loans.filter((l) =>
      (l.customerId?.$oid || l.customerId) === customerId
    );
  }
  if (status) {
    loans = loans.filter((l) => l.status === status);
  }
  if (pricingStatus) {
    loans = loans.filter((l) => l.pricingStatus === pricingStatus);
  }

  const total = loans.length;
  const start = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const paginatedLoans = loans.slice(start, start + parseInt(pageSize as string));

  res.json({
    data: normalizeIds(paginatedLoans),
    total,
  });
});

app.get('/api/loans/:id', (req: Request, res: Response) => {
  const loan = data.loans.find((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  res.json(normalizeId(loan));
});

app.put('/api/loans/:id', (req: Request, res: Response) => {
  const loanIndex = data.loans.findIndex((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (loanIndex === -1) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const loan = data.loans[loanIndex];
  const updates = req.body;

  // Apply pricing updates
  if (updates.pricing) {
    loan.pricing = { ...loan.pricing, ...updates.pricing };
    // Recalculate effective rate
    loan.pricing.effectiveRate = (loan.pricing.baseRate || 0) + (loan.pricing.spread || 0);
  }

  // Apply status updates
  if (updates.status) loan.status = updates.status;
  if (updates.pricingStatus) loan.pricingStatus = updates.pricingStatus;

  loan.updatedAt = new Date().toISOString();

  // Create audit entry
  const auditEntry = {
    _id: generateId(),
    entityType: 'loan',
    entityId: req.params.id,
    loanId: req.params.id,
    action: 'update',
    changes: Object.keys(updates).map((key) => ({
      field: key,
      oldValue: data.loans[loanIndex][key],
      newValue: updates[key],
    })),
    userId: req.headers['x-user-id'] || 'system',
    userName: req.headers['x-user-name'] || 'System',
    timestamp: new Date().toISOString(),
  };
  data.auditEntries.unshift(auditEntry);

  data.loans[loanIndex] = loan;
  res.json(normalizeId(loan));
});

// Batch update
app.put('/api/loans/batch', (req: Request, res: Response) => {
  const items = req.body;
  const results = [];

  for (const { loanId, updates } of items) {
    const loanIndex = data.loans.findIndex((l) =>
      (l._id?.$oid || l._id || l.id) === loanId
    );

    if (loanIndex === -1) {
      results.push({ loanId, success: false, error: 'Loan not found' });
      continue;
    }

    const loan = data.loans[loanIndex];

    if (updates.pricing) {
      loan.pricing = { ...loan.pricing, ...updates.pricing };
      loan.pricing.effectiveRate = (loan.pricing.baseRate || 0) + (loan.pricing.spread || 0);
    }
    if (updates.status) loan.status = updates.status;
    if (updates.pricingStatus) loan.pricingStatus = updates.pricingStatus;

    loan.updatedAt = new Date().toISOString();
    data.loans[loanIndex] = loan;
    results.push({ loanId, success: true, loan: normalizeId(loan) });
  }

  res.json({ results });
});

// ============================================
// FEES
// ============================================
app.post('/api/loans/:id/fees', (req: Request, res: Response) => {
  const loanIndex = data.loans.findIndex((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (loanIndex === -1) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const loan = data.loans[loanIndex];
  const { feeConfigId } = req.body;

  // Check for duplicate
  const existingFee = loan.fees?.find((f: any) => f.feeConfigId === feeConfigId);
  if (existingFee) {
    // Return loan unchanged (graceful handling)
    return res.json(normalizeId(loan));
  }

  const feeConfig = data.feeConfigs.find((fc) =>
    (fc._id?.$oid || fc._id || fc.id) === feeConfigId
  );

  if (!feeConfig) {
    return res.status(404).json({ error: 'Fee config not found' });
  }

  // Calculate fee amount
  let calculatedAmount = 0;
  if (feeConfig.calculationType === 'flat') {
    calculatedAmount = feeConfig.defaultFlatAmount || 0;
  } else if (feeConfig.calculationType === 'percentage') {
    calculatedAmount = loan.totalAmount * (feeConfig.defaultRate || 0);
  }

  const newFee = {
    _id: generateId(),
    feeConfigId,
    code: feeConfig.code,
    type: feeConfig.type,
    name: feeConfig.name,
    calculationType: feeConfig.calculationType,
    flatAmount: feeConfig.defaultFlatAmount,
    rate: feeConfig.defaultRate,
    calculatedAmount,
    currency: loan.currency,
    isPaid: false,
    isWaived: false,
    isOverridden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!loan.fees) loan.fees = [];
  loan.fees.push(newFee);

  // Recalculate totals
  loan.totalFees = loan.fees.reduce((sum: number, f: any) => sum + (f.calculatedAmount || 0), 0);
  loan.netProceeds = loan.totalAmount - loan.interestAmount - loan.totalFees;

  // Create audit entry
  const auditEntry = {
    _id: generateId(),
    entityType: 'fee',
    entityId: newFee._id,
    loanId: req.params.id,
    action: 'create',
    newValue: newFee,
    userId: req.headers['x-user-id'] || 'system',
    userName: req.headers['x-user-name'] || 'System',
    timestamp: new Date().toISOString(),
  };
  data.auditEntries.unshift(auditEntry);

  loan.updatedAt = new Date().toISOString();
  data.loans[loanIndex] = loan;
  res.json(normalizeId(loan));
});

app.put('/api/loans/:loanId/fees/:feeId', (req: Request, res: Response) => {
  const loanIndex = data.loans.findIndex((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.loanId
  );

  if (loanIndex === -1) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const loan = data.loans[loanIndex];
  const feeIndex = loan.fees?.findIndex((f: any) =>
    (f._id?.$oid || f._id || f.id) === req.params.feeId
  );

  if (feeIndex === -1 || feeIndex === undefined) {
    return res.status(404).json({ error: 'Fee not found' });
  }

  const updates = req.body;
  const fee = loan.fees[feeIndex];
  const oldFee = { ...fee };

  if (updates.calculatedAmount !== undefined) {
    fee.calculatedAmount = updates.calculatedAmount;
    fee.isOverridden = true;
  }
  if (updates.flatAmount !== undefined) fee.flatAmount = updates.flatAmount;
  if (updates.rate !== undefined) fee.rate = updates.rate;

  fee.updatedAt = new Date().toISOString();

  // Recalculate totals
  loan.totalFees = loan.fees.reduce((sum: number, f: any) => sum + (f.calculatedAmount || 0), 0);
  loan.netProceeds = loan.totalAmount - loan.interestAmount - loan.totalFees;

  loan.updatedAt = new Date().toISOString();
  data.loans[loanIndex] = loan;
  res.json(normalizeId(loan));
});

app.delete('/api/loans/:loanId/fees/:feeId', (req: Request, res: Response) => {
  const loanIndex = data.loans.findIndex((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.loanId
  );

  if (loanIndex === -1) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const loan = data.loans[loanIndex];
  const feeIndex = loan.fees?.findIndex((f: any) =>
    (f._id?.$oid || f._id || f.id) === req.params.feeId
  );

  if (feeIndex === -1 || feeIndex === undefined) {
    return res.status(404).json({ error: 'Fee not found' });
  }

  const deletedFee = loan.fees.splice(feeIndex, 1)[0];

  // Recalculate totals
  loan.totalFees = loan.fees.reduce((sum: number, f: any) => sum + (f.calculatedAmount || 0), 0);
  loan.netProceeds = loan.totalAmount - loan.interestAmount - loan.totalFees;

  // Create audit entry
  const auditEntry = {
    _id: generateId(),
    entityType: 'fee',
    entityId: req.params.feeId,
    loanId: req.params.loanId,
    action: 'delete',
    oldValue: deletedFee,
    userId: req.headers['x-user-id'] || 'system',
    userName: req.headers['x-user-name'] || 'System',
    timestamp: new Date().toISOString(),
  };
  data.auditEntries.unshift(auditEntry);

  loan.updatedAt = new Date().toISOString();
  data.loans[loanIndex] = loan;
  res.json(normalizeId(loan));
});

// ============================================
// FEE CONFIGS
// ============================================
app.get('/api/fee-configs', (_req: Request, res: Response) => {
  res.json(normalizeIds(data.feeConfigs));
});

// ============================================
// CALCULATIONS (Preview)
// ============================================

/**
 * Helper function to calculate loan preview
 */
function calculateLoanPreview(loan: any, pricing?: any, feeChanges?: any) {
  // Calculate preview values
  let baseRate = loan.pricing?.baseRate || 0;
  let spread = loan.pricing?.spread || 0;

  if (pricing?.baseRate !== undefined) baseRate = pricing.baseRate;
  if (pricing?.spread !== undefined) spread = pricing.spread;

  const effectiveRate = baseRate + spread;

  // Calculate days for interest (simplified)
  const startDate = new Date(loan.startDate);
  const maturityDate = new Date(loan.maturityDate);
  const days = Math.ceil((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const interestAmount = (loan.totalAmount * (effectiveRate / 100) * days) / 365;

  // Calculate fees
  let totalFees = loan.totalFees || 0;
  const originalTotalFees = loan.totalFees || 0;

  if (feeChanges?.adds) {
    for (const add of feeChanges.adds) {
      const feeConfig = data.feeConfigs.find((fc) =>
        (fc._id?.$oid || fc._id || fc.id) === add.feeConfigId
      );
      if (feeConfig) {
        if (feeConfig.calculationType === 'flat') {
          totalFees += feeConfig.defaultFlatAmount || 0;
        } else if (feeConfig.calculationType === 'percentage') {
          totalFees += loan.totalAmount * ((feeConfig.defaultRate || 0) / 100);
        }
      }
    }
  }

  if (feeChanges?.updates) {
    for (const upd of feeChanges.updates) {
      const fee = loan.fees?.find((f: any) =>
        (f._id?.$oid || f._id || f.id) === upd.feeId
      );
      if (fee) {
        // Remove old amount and add new amount
        totalFees -= fee.calculatedAmount || 0;
        totalFees += upd.calculatedAmount || 0;
      }
    }
  }

  if (feeChanges?.deletes) {
    for (const del of feeChanges.deletes) {
      const fee = loan.fees?.find((f: any) =>
        (f._id?.$oid || f._id || f.id) === del.feeId
      );
      if (fee) {
        totalFees -= fee.calculatedAmount || 0;
      }
    }
  }

  const netProceeds = loan.totalAmount - interestAmount - totalFees;
  const originalInterestAmount = loan.interestAmount || 0;
  const originalNetProceeds = loan.netProceeds || 0;

  return {
    effectiveRate,
    interestAmount,
    originalInterestAmount,
    totalFees,
    originalTotalFees,
    netProceeds,
    originalNetProceeds,
  };
}

// Preview pricing (single loan)
app.post('/api/loans/:id/preview-pricing', (req: Request, res: Response) => {
  const loan = data.loans.find((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const { pricing } = req.body;
  const preview = calculateLoanPreview(loan, pricing);

  res.json(preview);
});

// Full preview (with fee changes)
app.post('/api/loans/:id/preview-full', (req: Request, res: Response) => {
  const loan = data.loans.find((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const { pricing, feeChanges } = req.body;
  const preview = calculateLoanPreview(loan, pricing, feeChanges);

  res.json(preview);
});

// Batch preview pricing
app.post('/api/loans/batch-preview-pricing', (req: Request, res: Response) => {
  const items = req.body as Array<{ loanId: string; pricing: any }>;
  const results = items.map((item) => {
    const loan = data.loans.find((l) =>
      (l._id?.$oid || l._id || l.id) === item.loanId
    );

    if (!loan) {
      return {
        loanId: item.loanId,
        success: false,
        error: 'Loan not found',
      };
    }

    const preview = calculateLoanPreview(loan, item.pricing);

    return {
      loanId: item.loanId,
      success: true,
      preview,
    };
  });

  res.json({ results });
});

// Legacy preview endpoint (for compatibility)
app.post('/api/loans/:id/preview', (req: Request, res: Response) => {
  const loan = data.loans.find((l) =>
    (l._id?.$oid || l._id || l.id) === req.params.id
  );

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const { pricing, feeChanges } = req.body;
  const preview = calculateLoanPreview(loan, pricing, feeChanges);

  res.json(preview);
});

// ============================================
// AUDIT
// ============================================
app.get('/api/loans/:id/audit', (req: Request, res: Response) => {
  const loanId = req.params.id;
  const { limit = '50' } = req.query;

  let entries = data.auditEntries.filter((e) => e.loanId === loanId);
  const total = entries.length;
  entries = entries.slice(0, parseInt(limit as string));

  // Return in the expected format: { entries: [...], total: number }
  res.json({
    entries: normalizeIds(entries),
    total,
  });
});

app.get('/api/audit', (req: Request, res: Response) => {
  let entries = [...data.auditEntries];
  const { loanId, entityType, limit = '50' } = req.query;

  if (loanId) {
    entries = entries.filter((e) => e.loanId === loanId);
  }
  if (entityType) {
    entries = entries.filter((e) => e.entityType === entityType);
  }

  const total = entries.length;
  entries = entries.slice(0, parseInt(limit as string));

  // Return in the expected format: { entries: [...], total: number }
  res.json({
    entries: normalizeIds(entries),
    total,
  });
});

// ============================================
// SNAPSHOTS (Playback Feature)
// ============================================

/**
 * Calculate summary for a set of loans (grouped by currency)
 */
function calculateSnapshotSummary(loans: any[]): Record<string, any> {
  const summary: Record<string, any> = {};

  for (const loan of loans) {
    const currency = loan.currency || 'USD';
    if (!summary[currency]) {
      summary[currency] = {
        loanCount: 0,
        totalAmount: 0,
        totalFees: 0,
        totalInterest: 0,
        netProceeds: 0,
        avgRate: 0,
      };
    }
    summary[currency].loanCount++;
    summary[currency].totalAmount += loan.totalAmount || 0;
    summary[currency].totalFees += loan.totalFees || 0;
    summary[currency].totalInterest += loan.interestAmount || 0;
    summary[currency].netProceeds += loan.netProceeds || 0;
    summary[currency].avgRate += loan.pricing?.effectiveRate || 0;
  }

  // Calculate average rate per currency
  for (const currency of Object.keys(summary)) {
    if (summary[currency].loanCount > 0) {
      summary[currency].avgRate = summary[currency].avgRate / summary[currency].loanCount;
    }
  }

  return summary;
}

/**
 * Calculate delta between two snapshots
 */
function calculateSnapshotDelta(
  currentSummary: Record<string, any>,
  previousSummary: Record<string, any> | null
): Record<string, any> | null {
  if (!previousSummary) return null;

  const delta: Record<string, any> = {};

  for (const currency of Object.keys(currentSummary)) {
    const current = currentSummary[currency];
    const previous = previousSummary[currency];

    if (previous) {
      delta[currency] = {
        feesChange: current.totalFees - previous.totalFees,
        interestChange: current.totalInterest - previous.totalInterest,
        netProceedsChange: current.netProceeds - previous.netProceeds,
        avgRateChange: Math.round((current.avgRate - previous.avgRate) * 100), // basis points
      };
    }
  }

  return Object.keys(delta).length > 0 ? delta : null;
}

// List snapshots for customer (timeline view)
app.get('/api/snapshots', (req: Request, res: Response) => {
  const { customerId, limit = '20', skip = '0' } = req.query;

  let snapshots = [...data.snapshots];

  if (customerId) {
    snapshots = snapshots.filter(
      (s) => (s.customerId?.$oid || s.customerId) === customerId
    );
  }

  // Sort by timestamp descending (most recent first)
  snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = snapshots.length;
  const skipNum = parseInt(skip as string);
  const limitNum = parseInt(limit as string);
  const paginatedSnapshots = snapshots.slice(skipNum, skipNum + limitNum);

  // Return summary data only (no loans)
  const summaries = paginatedSnapshots.map((s) => ({
    id: s._id || s.id,
    customerId: s.customerId?.$oid || s.customerId,
    timestamp: s.timestamp,
    userId: s.userId,
    userName: s.userName,
    summary: s.summary,
    delta: s.delta,
    changes: s.changes || { fees: [], rates: [], invoices: [], statuses: [] },
    changeCount: s.changeCount,
    description: s.description,
  }));

  res.json({
    snapshots: summaries,
    total,
    limit: limitNum,
    skip: skipNum,
  });
});

// Get single snapshot with loans (for playback)
app.get('/api/snapshots/:id', (req: Request, res: Response) => {
  const snapshot = data.snapshots.find(
    (s) => (s._id || s.id) === req.params.id
  );

  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  // Return full snapshot with loans
  res.json({
    id: snapshot._id || snapshot.id,
    customerId: snapshot.customerId?.$oid || snapshot.customerId,
    timestamp: snapshot.timestamp,
    userId: snapshot.userId,
    userName: snapshot.userName,
    summary: snapshot.summary,
    delta: snapshot.delta,
    changes: snapshot.changes || { fees: [], rates: [], invoices: [], statuses: [] },
    changeCount: snapshot.changeCount,
    description: snapshot.description,
    loans: normalizeIds(snapshot.loans || []),
  });
});

// Create new snapshot
app.post('/api/snapshots', (req: Request, res: Response) => {
  const { customerId, loans, changes, changeCount = 0, description } = req.body;

  if (!customerId || !loans) {
    return res.status(400).json({ error: 'customerId and loans are required' });
  }

  // Calculate summary
  const summary = calculateSnapshotSummary(loans);

  // Get previous snapshot for delta calculation
  const previousSnapshots = data.snapshots
    .filter((s) => (s.customerId?.$oid || s.customerId) === customerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const previousSnapshot = previousSnapshots[0] || null;
  const previousSummary = previousSnapshot?.summary || null;

  // Calculate delta
  const delta = calculateSnapshotDelta(summary, previousSummary);

  const newSnapshot = {
    _id: generateId(),
    customerId,
    timestamp: new Date().toISOString(),
    userId: req.headers['x-user-id'] || 'user-1',
    userName: req.headers['x-user-name'] || 'Demo User',
    summary,
    delta,
    changes: changes || { fees: [], rates: [], invoices: [], statuses: [] },
    changeCount,
    description,
    loans: loans.map((l: any) => ({ ...l })), // Store a copy of loans
  };

  data.snapshots.unshift(newSnapshot);

  // Return summary only
  res.status(201).json({
    id: newSnapshot._id,
    customerId: newSnapshot.customerId,
    timestamp: newSnapshot.timestamp,
    userId: newSnapshot.userId,
    userName: newSnapshot.userName,
    summary: newSnapshot.summary,
    delta: newSnapshot.delta,
    changes: newSnapshot.changes,
    changeCount: newSnapshot.changeCount,
    description: newSnapshot.description,
  });
});

// Delete all snapshots (for test cleanup)
app.delete('/api/snapshots/all', (_req: Request, res: Response) => {
  const deletedCount = data.snapshots.length;
  data.snapshots = [];
  res.json({ deleted: deletedCount, message: 'All snapshots deleted' });
});

// ============================================
// RESET DATA (for tests)
// ============================================
app.post('/api/mock/reset', (_req: Request, res: Response) => {
  data = loadData();
  res.json({ success: true, message: 'Data reset to initial state' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
  console.log(`   Loaded: ${data.customers.length} customers, ${data.loans.length} loans`);
  console.log(`   Mode: In-memory (no MongoDB required)`);
});
