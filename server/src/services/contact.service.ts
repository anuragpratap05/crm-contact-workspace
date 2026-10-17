import type { FilterQuery, SortOrder } from 'mongoose';
import { ContactModel, type Contact } from '../models/contact.model.js';
import { NotFoundError } from '../errors/AppError.js';
import { digitsOnly, escapeRegex } from '../utils/normalize.js';
import type { ListContactsQuery } from '../validators/contact.validator.js';

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
