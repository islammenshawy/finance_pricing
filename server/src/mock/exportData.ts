/**
 * Export all data from MongoDB to JSON files for mock server
 * Run with: npx tsx server/src/mock/exportData.ts
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Customer, Loan, FeeConfig, AuditEntry } from '../models';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loan_pricing';

async function exportData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Export customers
  console.log('Exporting customers...');
  const customers = await Customer.find({ isActive: true }).lean();
  fs.writeFileSync(
    path.join(dataDir, 'customers.json'),
    JSON.stringify(customers, null, 2)
  );
  console.log(`  ✓ ${customers.length} customers exported`);

  // Export fee configs
  console.log('Exporting fee configs...');
  const feeConfigs = await FeeConfig.find({ isActive: true }).lean();
  fs.writeFileSync(
    path.join(dataDir, 'feeConfigs.json'),
    JSON.stringify(feeConfigs, null, 2)
  );
  console.log(`  ✓ ${feeConfigs.length} fee configs exported`);

  // Export all loans with full details
  console.log('Exporting loans...');
  const loans = await Loan.find({}).lean();
  fs.writeFileSync(
    path.join(dataDir, 'loans.json'),
    JSON.stringify(loans, null, 2)
  );
  console.log(`  ✓ ${loans.length} loans exported`);

  // Export recent audit entries (last 1000)
  console.log('Exporting audit entries...');
  const auditEntries = await AuditEntry.find({})
    .sort({ timestamp: -1 })
    .limit(1000)
    .lean();
  fs.writeFileSync(
    path.join(dataDir, 'auditEntries.json'),
    JSON.stringify(auditEntries, null, 2)
  );
  console.log(`  ✓ ${auditEntries.length} audit entries exported`);

  await mongoose.disconnect();
  console.log('\n✓ All data exported to server/src/mock/data/');
}

exportData().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
