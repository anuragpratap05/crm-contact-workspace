import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ContactModel } from '../models/contact.model.js';
import { logger } from '../utils/logger.js';
import { digitsOnly } from '../utils/normalize.js';

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Kavya',
  'James', 'Emily', 'Michael', 'Sarah', 'David', 'Laura', 'Daniel', 'Olivia',
  'Carlos', 'Sofia', 'Hiroshi', 'Yuki', 'Liam', 'Emma', 'Noah', 'Isabella',
  'Lucas', 'Mia', 'Ethan', 'Amelia', 'Omar', 'Fatima', 'Chen', 'Ling',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Kapoor', 'Mehta', 'Joshi',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Tanaka', 'Suzuki', 'Wilson', 'Anderson', 'Taylor',
  'Thomas', 'Moore', 'Jackson', 'Haddad', 'Khan', 'Wang', 'Li',
];

const COMPANIES = [
  'Northwind Trading', 'Acme Logistics', 'Vertex Labs', 'BlueRiver Media',
  'Summit Health', 'Quantum Freight', 'Orchid Realty', 'Lumen Analytics',
  'Harbour Legal', 'Pinecrest Foods', 'Ironclad Security', 'Nimbus Cloud',
];

const TAGS = ['Lead', 'Customer', 'VIP', 'Prospect', 'Churned', 'Partner'];

const TOTAL = 250;

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20260217);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function pickTags(): string[] {
  const count = Math.floor(random() * 4);
  const tags = new Set<string>();
  while (tags.size < count) {
    tags.add(pick(TAGS));
  }
  return [...tags];
}

function buildContacts() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return Array.from({ length: TOTAL }, (_, index) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const company = random() < 0.9 ? pick(COMPANIES) : undefined;
    const phone = `+1-${200 + Math.floor(random() * 700)}-${1000 + Math.floor(random() * 9000)}`;

    const email =
      random() < 0.92
        ? `${firstName}.${lastName}${index}@${(company ?? 'freelance').split(' ')[0]!.toLowerCase()}.com`
        : undefined;

    const createdAt = new Date(
      now - (TOTAL - index) * dayMs - Math.floor(random() * 24) * 3600 * 1000,
    );

    return {
      firstName,
      lastName,
      email: email?.toLowerCase(),
      phone,
      company,
      tags: pickTags(),
      firstNameLower: firstName.toLowerCase(),
      lastNameLower: lastName.toLowerCase(),
      companyLower: company?.toLowerCase(),
      phoneDigits: digitsOnly(phone),
      version: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

async function seed() {
  await connectDatabase();

  const existing = await ContactModel.estimatedDocumentCount();
  if (existing > 0 && !process.argv.includes('--force')) {
    logger.warn(
      `Database already contains ${existing} contacts. Re-run with --force to replace them.`,
    );
    await disconnectDatabase();
    return;
  }

  await ContactModel.deleteMany({});
  await ContactModel.syncIndexes();

  const contacts = buildContacts();
  await ContactModel.insertMany(contacts, { ordered: false });

  const withEmail = contacts.filter((contact) => contact.email).length;
  const withTags = contacts.filter((contact) => contact.tags.length > 0).length;

  logger.info(
    `Seeded ${contacts.length} contacts (${withEmail} with email, ${withTags} tagged)`,
  );

  await disconnectDatabase();
}

seed().catch((err) => {
  logger.fatal({ err }, 'Seed failed');
  process.exit(1);
});
