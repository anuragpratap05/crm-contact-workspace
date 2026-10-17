import { ActivityModel, type ActivityTypeValue } from '../models/activity.model.js';
import { logger } from '../utils/logger.js';

export interface ActivityResponse {
  id: string;
  contactId: string;
  type: ActivityTypeValue;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface ActivityRecord {
  _id: unknown;
  contactId: unknown;
  type: ActivityTypeValue;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

function toActivityResponse(doc: ActivityRecord): ActivityResponse {
  return {
    id: String(doc._id),
    contactId: String(doc.contactId),
    type: doc.type,
    ...(doc.metadata ? { metadata: doc.metadata } : {}),
    createdAt: doc.createdAt,
  };
}

export async function recordActivity(
  contactId: string,
  type: ActivityTypeValue,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await ActivityModel.create({ contactId, type, metadata });
  } catch (err) {
    logger.error({ err, contactId, type }, 'Failed to record activity');
  }
}

export async function recordActivities(
  entries: Array<{ contactId: string; type: ActivityTypeValue; metadata?: Record<string, unknown> }>,
): Promise<void> {
  if (entries.length === 0) return;

  try {
    await ActivityModel.insertMany(entries, { ordered: false });
  } catch (err) {
    logger.error({ err, count: entries.length }, 'Failed to record activities');
  }
}

export async function listActivitiesForContact(
  contactId: string,
  limit: number,
): Promise<ActivityResponse[]> {
  const documents = await ActivityModel.find({ contactId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean<ActivityRecord[]>()
    .exec();

  return documents.map(toActivityResponse);
}
