import type { RequestHandler } from 'express';
import { validated } from '../middleware/validate.js';
import {
  addTagToContact,
  bulkUpdateTag,
  getContactById,
  listContacts,
  listDistinctCompanies,
  listDistinctTags,
  removeTagFromContact,
  updateContact,
} from '../services/contact.service.js';
import { listActivitiesForContact } from '../services/activity.service.js';
import type {
  ActivityQuery,
  AddTagBody,
  BulkTagBody,
  ListContactsQuery,
  TagParams,
  UpdateContactBody,
} from '../validators/contact.validator.js';

export const getContacts: RequestHandler = async (req, res) => {
  const query = validated<ListContactsQuery>(req, 'query');
  const result = await listContacts(query);
  res.json(result);
};

export const getContact: RequestHandler = async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const contact = await getContactById(id);
  res.json({ data: contact });
};

export const getTags: RequestHandler = async (_req, res) => {
  const tags = await listDistinctTags();
  res.json({ data: tags });
};

export const getCompanies: RequestHandler = async (_req, res) => {
  const companies = await listDistinctCompanies();
  res.json({ data: companies });
};

export const putContact: RequestHandler = async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const body = validated<UpdateContactBody>(req, 'body');
  const contact = await updateContact(id, body);
  res.json({ data: contact });
};

export const getContactActivities: RequestHandler = async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const { limit } = validated<ActivityQuery>(req, 'query');
  await getContactById(id);
  const activities = await listActivitiesForContact(id, limit);
  res.json({ data: activities });
};

export const postContactTag: RequestHandler = async (req, res) => {
  const { id } = validated<{ id: string }>(req, 'params');
  const { tag } = validated<AddTagBody>(req, 'body');
  const contact = await addTagToContact(id, tag);
  res.json({ data: contact });
};

export const deleteContactTag: RequestHandler = async (req, res) => {
  const { id, tag } = validated<TagParams>(req, 'params');
  const contact = await removeTagFromContact(id, tag);
  res.json({ data: contact });
};

export const postBulkTag: RequestHandler = async (req, res) => {
  const body = validated<BulkTagBody>(req, 'body');
  const result = await bulkUpdateTag(body);
  res.json({ data: result });
};
