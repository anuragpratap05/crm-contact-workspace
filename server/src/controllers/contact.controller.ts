import type { RequestHandler } from 'express';
import { validated } from '../middleware/validate.js';
import {
  getContactById,
  listContacts,
  listDistinctTags,
} from '../services/contact.service.js';
import type { ListContactsQuery } from '../validators/contact.validator.js';

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
