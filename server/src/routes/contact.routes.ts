import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  contactIdParamSchema,
  listContactsQuerySchema,
} from '../validators/contact.validator.js';
import { getContact, getContacts, getTags } from '../controllers/contact.controller.js';

export const contactRouter = Router();

contactRouter.get('/contacts', validate(listContactsQuerySchema, 'query'), getContacts);
contactRouter.get('/tags', getTags);
contactRouter.get(
  '/contacts/:id',
  validate(contactIdParamSchema, 'params'),
  getContact,
);
