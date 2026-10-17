import { Schema, model, Types, type InferSchemaType } from 'mongoose';

export const ActivityType = {
  CONTACT_UPDATED: 'CONTACT_UPDATED',
  TAG_ADDED: 'TAG_ADDED',
  TAG_REMOVED: 'TAG_REMOVED',
} as const;

export type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

const activitySchema = new Schema(
  {
    contactId: { type: Types.ObjectId, ref: 'Contact', required: true },
    type: { type: String, enum: Object.values(ActivityType), required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

activitySchema.index(
  { contactId: 1, createdAt: -1, _id: -1 },
  { name: 'activity_by_contact' },
);

export type Activity = InferSchemaType<typeof activitySchema>;

export const ActivityModel = model('Activity', activitySchema);
