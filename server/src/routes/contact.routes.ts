import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  activityQuerySchema,
  addTagBodySchema,
  bulkTagBodySchema,
  contactIdParamSchema,
  listContactsQuerySchema,
  tagParamSchema,
  updateContactBodySchema,
} from '../validators/contact.validator.js';
import {
  deleteContactTag,
  getContact,
  getContactActivities,
  getContacts,
  getTags,
  postBulkTag,
  postContactTag,
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

contactRouter.post(
  '/contacts/tags/bulk',
  validate(bulkTagBodySchema, 'body'),
  postBulkTag,
);

contactRouter.post(
  '/contacts/:id/tags',
  validate(contactIdParamSchema, 'params'),
  validate(addTagBodySchema, 'body'),
  postContactTag,
);

contactRouter.delete(
  '/contacts/:id/tags/:tag',
  validate(tagParamSchema, 'params'),
  deleteContactTag,
);
