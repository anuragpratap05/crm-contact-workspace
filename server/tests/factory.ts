import { ContactModel } from '../src/models/contact.model.js';
import { digitsOnly } from '../src/utils/normalize.js';

interface ContactInput {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tags?: string[];
  createdAt?: Date;
}

export async function createContact(input: ContactInput = {}) {
  const firstName = input.firstName ?? 'Test';
  const lastName = input.lastName ?? 'Contact';
  const email = input.email === null ? null : (input.email ?? `${firstName}.${lastName}@example.com`).toLowerCase();
  const phone = input.phone ?? '+1-555-0100';
  const company = input.company === null ? null : (input.company ?? 'Example Corp');
  const createdAt = input.createdAt ?? new Date();

  const doc = await ContactModel.create({
    firstName,
    lastName,
    email,
    phone,
    company,
    tags: input.tags ?? [],
    firstNameLower: firstName.toLowerCase(),
    lastNameLower: lastName.toLowerCase(),
    companyLower: company?.toLowerCase() ?? null,
    phoneDigits: digitsOnly(phone ?? undefined) ?? null,
    version: 0,
    createdAt,
    updatedAt: createdAt,
  });

  return doc.toObject();
}

export async function createContacts(count: number, prefix = 'User') {
  const made = [];
  for (let i = 0; i < count; i += 1) {
    made.push(
      await createContact({
        firstName: `${prefix}${String(i).padStart(3, '0')}`,
        lastName: 'Bulk',
        email: `${prefix.toLowerCase()}${i}@example.com`,
        createdAt: new Date(Date.now() - i * 60_000),
      }),
    );
  }
  return made;
}
