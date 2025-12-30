import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer {
  id: string;
  code: string;           // Customer code: "ACME", "EURO-TRADE"
  name: string;
  country: string;
  industry: string;
  creditRating?: string;
  relationshipManager?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDocument extends Omit<ICustomer, 'id'>, Document {}

const CustomerSchema = new Schema<CustomerDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    country: { type: String, required: true },
    industry: { type: String, required: true },
    creditRating: { type: String },
    relationshipManager: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
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

export const Customer = mongoose.model<CustomerDocument>('Customer', CustomerSchema);
