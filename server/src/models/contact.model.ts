import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const contactSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    company: { type: String, trim: true, maxlength: 120 },
    tags: { type: [String], default: [] },

    firstNameLower: { type: String, required: true },
    lastNameLower: { type: String, required: true },
    companyLower: { type: String },
    phoneDigits: { type: String },

    version: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

contactSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    name: 'uniq_email_when_present',
  },
);

contactSchema.index({ lastNameLower: 1, firstNameLower: 1, _id: 1 }, { name: 'sort_by_name' });
contactSchema.index({ createdAt: -1, _id: -1 }, { name: 'sort_by_created' });
contactSchema.index({ firstNameLower: 1 }, { name: 'search_first_name' });
contactSchema.index({ phoneDigits: 1 }, { name: 'search_phone' });
contactSchema.index({ tags: 1 }, { name: 'filter_tags' });
contactSchema.index({ companyLower: 1 }, { name: 'filter_company' });

export type Contact = InferSchemaType<typeof contactSchema>;
export type ContactDocument = HydratedDocument<Contact>;

export const ContactModel = model('Contact', contactSchema);
