import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  activityQuerySchema,
  contactIdParamSchema,
  listContactsQuerySchema,
  updateContactBodySchema,
} from '../validators/contact.validator.js';
import {
  getContact,
  getContactActivities,
  getContacts,
  getTags,
  putContact,
} from '../controllers/contact.controller.js';

export const contactRouter = Router();

contactRouter.get('/contacts', validate(listContactsQuerySchema, 'query'), getContacts);
contactRouter.get('/tags', getTags);
contactRouter.get(
  '/contacts/:id',
  validate(contactIdParamSchema, 'params'),
  getContact,
);

contactRouter.put(
  '/contacts/:id',
  validate(contactIdParamSchema, 'params'),
  validate(updateContactBodySchema, 'body'),
  putContact,
);

contactRouter.get(
  '/contacts/:id/activities',
  validate(contactIdParamSchema, 'params'),
  validate(activityQuerySchema, 'query'),
  getContactActivities,
);
