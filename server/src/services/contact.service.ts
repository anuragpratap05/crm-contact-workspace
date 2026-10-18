import type { FilterQuery, SortOrder } from 'mongoose';
import { ContactModel, type Contact } from '../models/contact.model.js';
import {
  DuplicateEmailError,
  NotFoundError,
  VersionConflictError,
} from '../errors/AppError.js';
import { digitsOnly, escapeRegex } from '../utils/normalize.js';
import type {
  BulkTagBody,
  ListContactsQuery,
  UpdateContactBody,
} from '../validators/contact.validator.js';
import { ActivityType } from '../models/activity.model.js';
import { recordActivities, recordActivity } from './activity.service.js';

export interface ContactResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

type ContactRecord = Contact & { _id: unknown; createdAt: Date; updatedAt: Date };

export function toContactResponse(doc: ContactRecord): ContactResponse {
  return {
    id: String(doc._id),
    firstName: doc.firstName,
    lastName: doc.lastName,
    ...(doc.email ? { email: doc.email } : {}),
    ...(doc.phone ? { phone: doc.phone } : {}),
    ...(doc.company ? { company: doc.company } : {}),
    tags: doc.tags ?? [],
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function buildFilter(query: ListContactsQuery): FilterQuery<Contact> {
  const filter: FilterQuery<Contact> = {};

  if (query.search) {
    const prefix = `^${escapeRegex(query.search.toLowerCase())}`;
    const phonePrefix = digitsOnly(query.search);

    filter.$or = [
      { firstNameLower: { $regex: prefix } },
      { lastNameLower: { $regex: prefix } },
      { email: { $type: 'string', $regex: prefix } },
      ...(phonePrefix ? [{ phoneDigits: { $regex: `^${phonePrefix}` } }] : []),
    ];
  }

  if (query.tags?.length) {
    filter.tags = query.tagMatch === 'all' ? { $all: query.tags } : { $in: query.tags };
  }

  if (query.company) {
    filter.companyLower = query.company.toLowerCase();
  }

  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {
      ...(query.createdFrom ? { $gte: query.createdFrom } : {}),
      ...(query.createdTo ? { $lte: query.createdTo } : {}),
    };
  }

  return filter;
}

function buildSort(query: ListContactsQuery): Record<string, SortOrder> {
  const direction: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

  if (query.sortBy === 'name') {
    return { lastNameLower: direction, firstNameLower: direction, _id: direction };
  }

  return { [query.sortBy]: direction, _id: direction };
}

export interface PaginatedContacts {
  items: ContactResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function listContacts(query: ListContactsQuery): Promise<PaginatedContacts> {
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [documents, total] = await Promise.all([
    ContactModel.find(filter)
      .sort(buildSort(query))
      .skip(skip)
      .limit(query.limit)
      .lean<ContactRecord[]>()
      .exec(),
    ContactModel.countDocuments(filter).exec(),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    items: documents.map(toContactResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1 && total > 0,
    },
  };
}

export async function getContactById(id: string): Promise<ContactResponse> {
  const document = await ContactModel.findById(id).lean<ContactRecord>().exec();

  if (!document) {
    throw new NotFoundError('Contact');
  }

  return toContactResponse(document);
}

export async function listDistinctTags(): Promise<string[]> {
  const tags = await ContactModel.distinct('tags').exec();
  return (tags as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function listDistinctCompanies(): Promise<string[]> {
  const companies = await ContactModel.distinct('company').exec();

  const byLowercase = new Map<string, string>();
  for (const company of companies as string[]) {
    if (!company) continue;
    const key = company.toLowerCase();
    if (!byLowercase.has(key)) byLowercase.set(key, company);
  }

  return [...byLowercase.values()].sort((a, b) => a.localeCompare(b));
}

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function buildUpdate(body: UpdateContactBody) {
  const email = body.email?.toLowerCase() ?? null;

  return {
    firstName: body.firstName,
    lastName: body.lastName,
    email,
    phone: body.phone,
    company: body.company,
    firstNameLower: body.firstName.toLowerCase(),
    lastNameLower: body.lastName.toLowerCase(),
    companyLower: body.company?.toLowerCase() ?? null,
    phoneDigits: digitsOnly(body.phone) ?? null,
  };
}

function changedFields(previous: ContactRecord, body: UpdateContactBody): EditableField[] {
  return EDITABLE_FIELDS.filter((field) => {
    const before = previous[field] ?? null;
    const after = field === 'email' ? (body.email?.toLowerCase() ?? null) : (body[field] ?? null);
    return before !== after;
  });
}

export async function updateContact(
  id: string,
  body: UpdateContactBody,
): Promise<ContactResponse> {
  const previous = await ContactModel.findById(id).lean<ContactRecord>().exec();

  if (!previous) {
    throw new NotFoundError('Contact');
  }

  const update = buildUpdate(body);

  let updated: ContactRecord | null;
  try {
    updated = await ContactModel.findOneAndUpdate(
      { _id: id, version: body.version },
      { $set: update, $inc: { version: 1 } },
      { new: true, runValidators: true },
    )
      .lean<ContactRecord>()
      .exec();
  } catch (err) {
    if (isDuplicateKeyError(err) && update.email) {
      throw new DuplicateEmailError(update.email);
    }
    throw err;
  }

  if (!updated) {
    const current = await ContactModel.findById(id).lean<ContactRecord>().exec();

    if (!current) {
      throw new NotFoundError('Contact');
    }

    throw new VersionConflictError(toContactResponse(current));
  }

  const fields = changedFields(previous, body);

  if (fields.length > 0) {
    await recordActivity(id, ActivityType.CONTACT_UPDATED, { fields });
  }

  return toContactResponse(updated);
}

export async function addTagToContact(id: string, tag: string): Promise<ContactResponse> {
  const changed = await ContactModel.findOneAndUpdate(
    { _id: id, tags: { $ne: tag } },
    { $addToSet: { tags: tag } },
    { new: true },
  )
    .lean<ContactRecord>()
    .exec();

  if (changed) {
    await recordActivity(id, ActivityType.TAG_ADDED, { tag });
    return toContactResponse(changed);
  }

  const existing = await ContactModel.findById(id).lean<ContactRecord>().exec();

  if (!existing) {
    throw new NotFoundError('Contact');
  }

  return toContactResponse(existing);
}

export async function removeTagFromContact(
  id: string,
  tag: string,
): Promise<ContactResponse> {
  const changed = await ContactModel.findOneAndUpdate(
    { _id: id, tags: tag },
    { $pull: { tags: tag } },
    { new: true },
  )
    .lean<ContactRecord>()
    .exec();

  if (changed) {
    await recordActivity(id, ActivityType.TAG_REMOVED, { tag });
    return toContactResponse(changed);
  }

  const existing = await ContactModel.findById(id).lean<ContactRecord>().exec();

  if (!existing) {
    throw new NotFoundError('Contact');
  }

  return toContactResponse(existing);
}

export interface BulkTagResult {
  matched: number;
  modified: number;
  tag: string;
  action: BulkTagBody['action'];
}

export async function bulkUpdateTag(body: BulkTagBody): Promise<BulkTagResult> {
  const { contactIds, tag, action } = body;

  const selector =
    action === 'add'
      ? { _id: { $in: contactIds }, tags: { $ne: tag } }
      : { _id: { $in: contactIds }, tags: tag };

  const affected = await ContactModel.find(selector)
    .select({ _id: 1 })
    .lean<{ _id: unknown }[]>()
    .exec();

  const affectedIds = affected.map((doc) => String(doc._id));

  if (affectedIds.length === 0) {
    const matched = await ContactModel.countDocuments({
      _id: { $in: contactIds },
    }).exec();

    return { matched, modified: 0, tag, action };
  }

  const result = await ContactModel.updateMany(
    { _id: { $in: affectedIds } },
    action === 'add' ? { $addToSet: { tags: tag } } : { $pull: { tags: tag } },
  ).exec();

  await recordActivities(
    affectedIds.map((contactId) => ({
      contactId,
      type: action === 'add' ? ActivityType.TAG_ADDED : ActivityType.TAG_REMOVED,
      metadata: { tag, bulk: true },
    })),
  );

  const matched = await ContactModel.countDocuments({
    _id: { $in: contactIds },
  }).exec();

  return { matched, modified: result.modifiedCount, tag, action };
}
