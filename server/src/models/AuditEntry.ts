import mongoose, { Schema, Document } from 'mongoose';
import type { AuditEntry as IAuditEntry } from '@loan-pricing/shared';

export interface AuditEntryDocument extends Omit<IAuditEntry, 'id'>, Document {}

const AuditEntrySchema = new Schema<AuditEntryDocument>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['loan', 'fee', 'invoice', 'currency'],
    },
    entityId: { type: String, required: true },
    loanId: { type: String, index: true }, // For quick loan-level queries
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'split'],
    },
    fieldName: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    userId: { type: String, required: true, default: 'system' },
    userName: { type: String, required: true, default: 'System' },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  {
    timestamps: false, // We use our own timestamp field
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for efficient querying
AuditEntrySchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditEntrySchema.index({ loanId: 1, timestamp: -1 });
AuditEntrySchema.index({ timestamp: -1 });

export const AuditEntry = mongoose.model<AuditEntryDocument>('AuditEntry', AuditEntrySchema);
