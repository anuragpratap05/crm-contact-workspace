import type { RequestHandler } from 'express';
import { validated } from '../middleware/validate.js';
import {
  getContactById,
  listContacts,
  listDistinctTags,
  updateContact,
} from '../services/contact.service.js';
import { listActivitiesForContact } from '../services/activity.service.js';
import type {
  ActivityQuery,
  ListContactsQuery,
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
