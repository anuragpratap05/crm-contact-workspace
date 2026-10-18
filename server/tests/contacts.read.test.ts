import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createContact, createContacts } from './factory.js';

const app = createApp();

describe('pagination', () => {
  it('reports accurate page metadata', async () => {
    await createContacts(25);

    const res = await request(app).get('/api/contacts?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.pagination).toMatchObject({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('never repeats or skips a contact when sort keys are identical', async () => {
    for (let i = 0; i < 25; i += 1) {
      await createContact({
        firstName: 'Same',
        lastName: 'Name',
        email: `same${i}@example.com`,
      });
    }

    const seen: string[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const res = await request(app).get(`/api/contacts?sortBy=name&page=${page}&limit=5`);
      seen.push(...res.body.items.map((c: { id: string }) => c.id));
    }

    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
  });

  it('returns an empty page rather than an error past the last page', async () => {
    await createContacts(5);

    const res = await request(app).get('/api/contacts?page=99&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination.hasNextPage).toBe(false);
  });

  it('handles no results', async () => {
    const res = await request(app).get('/api/contacts?search=nobodyhasthisname');

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.pagination.totalPages).toBe(0);
  });
});

describe('search', () => {
  it('matches a first name prefix, case-insensitively', async () => {
    await createContact({ firstName: 'Priya', lastName: 'Nair', email: 'p1@example.com' });
    await createContact({ firstName: 'Rohan', lastName: 'Patel', email: 'p2@example.com' });

    const res = await request(app).get('/api/contacts?search=PRI');

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.items[0].firstName).toBe('Priya');
  });

  it('matches a last name prefix', async () => {
    await createContact({ firstName: 'Alice', lastName: 'Zebra', email: 'z@example.com' });
    await createContact({ firstName: 'Bob', lastName: 'Young', email: 'y@example.com' });

    const res = await request(app).get('/api/contacts?search=zeb');

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.items[0].lastName).toBe('Zebra');
  });

  it('matches an email prefix', async () => {
    await createContact({ firstName: 'A', lastName: 'B', email: 'findme@example.com' });
    await createContact({ firstName: 'C', lastName: 'D', email: 'other@example.com' });

    const res = await request(app).get('/api/contacts?search=findme');

    expect(res.body.pagination.total).toBe(1);
  });

  it('matches a phone number regardless of formatting', async () => {
    await createContact({
      firstName: 'Phone',
      lastName: 'Person',
      email: 'ph@example.com',
      phone: '+1-797-5769',
    });

    const res = await request(app).get('/api/contacts?search=17975769');

    expect(res.body.pagination.total).toBe(1);
  });

  it('treats regex metacharacters as literal text', async () => {
    await createContacts(3);

    const res = await request(app).get('/api/contacts?search=.*');

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(0);
  });

  it('does not crash on an unbalanced bracket', async () => {
    await createContacts(2);

    const res = await request(app).get('/api/contacts?search=a(');

    expect(res.status).toBe(200);
  });
});

describe('filtering', () => {
  it('filters by a single tag', async () => {
    await createContact({ firstName: 'A', email: 'a@example.com', tags: ['VIP'] });
    await createContact({ firstName: 'B', email: 'b@example.com', tags: ['Lead'] });

    const res = await request(app).get('/api/contacts?tags=VIP');

    expect(res.body.pagination.total).toBe(1);
  });

  it('tagMatch=any returns contacts having either tag', async () => {
    await createContact({ firstName: 'A', email: 'a@example.com', tags: ['VIP'] });
    await createContact({ firstName: 'B', email: 'b@example.com', tags: ['Lead'] });
    await createContact({ firstName: 'C', email: 'c@example.com', tags: ['Churned'] });

    const res = await request(app).get('/api/contacts?tags=VIP,Lead');

    expect(res.body.pagination.total).toBe(2);
  });

  it('tagMatch=all requires every tag', async () => {
    await createContact({ firstName: 'A', email: 'a@example.com', tags: ['VIP', 'Lead'] });
    await createContact({ firstName: 'B', email: 'b@example.com', tags: ['VIP'] });

    const res = await request(app).get('/api/contacts?tags=VIP,Lead&tagMatch=all');

    expect(res.body.pagination.total).toBe(1);
  });

  it('filters by company, case-insensitively', async () => {
    await createContact({ firstName: 'A', email: 'a@example.com', company: 'Vertex Labs' });
    await createContact({ firstName: 'B', email: 'b@example.com', company: 'Acme' });

    const res = await request(app).get('/api/contacts?company=vertex%20labs');

    expect(res.body.pagination.total).toBe(1);
  });

  it('combines two filter attributes', async () => {
    await createContact({
      firstName: 'Match',
      email: 'a@example.com',
      company: 'Vertex Labs',
      tags: ['Customer'],
    });
    await createContact({
      firstName: 'WrongTag',
      email: 'b@example.com',
      company: 'Vertex Labs',
      tags: ['Lead'],
    });
    await createContact({
      firstName: 'WrongCompany',
      email: 'c@example.com',
      company: 'Acme',
      tags: ['Customer'],
    });

    const res = await request(app).get('/api/contacts?company=Vertex%20Labs&tags=Customer');

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.items[0].firstName).toBe('Match');
  });

  it('filters by a created date range', async () => {
    await createContact({
      firstName: 'Old',
      email: 'old@example.com',
      createdAt: new Date('2020-01-01'),
    });
    await createContact({
      firstName: 'New',
      email: 'new@example.com',
      createdAt: new Date('2026-01-01'),
    });

    const res = await request(app).get('/api/contacts?createdFrom=2025-01-01');

    expect(res.body.pagination.total).toBe(1);
    expect(res.body.items[0].firstName).toBe('New');
  });
});

describe('sorting', () => {
  it('sorts by name ascending and descending', async () => {
    await createContact({ firstName: 'A', lastName: 'Zulu', email: 'z@example.com' });
    await createContact({ firstName: 'B', lastName: 'Alpha', email: 'a@example.com' });
    await createContact({ firstName: 'C', lastName: 'Mike', email: 'm@example.com' });

    const asc = await request(app).get('/api/contacts?sortBy=name&sortOrder=asc');
    expect(asc.body.items.map((c: { lastName: string }) => c.lastName)).toEqual([
      'Alpha',
      'Mike',
      'Zulu',
    ]);

    const desc = await request(app).get('/api/contacts?sortBy=name&sortOrder=desc');
    expect(desc.body.items.map((c: { lastName: string }) => c.lastName)).toEqual([
      'Zulu',
      'Mike',
      'Alpha',
    ]);
  });

  it('sorts by created date, newest first by default', async () => {
    await createContact({
      firstName: 'Older',
      email: 'o@example.com',
      createdAt: new Date('2020-01-01'),
    });
    await createContact({
      firstName: 'Newer',
      email: 'n@example.com',
      createdAt: new Date('2026-01-01'),
    });

    const res = await request(app).get('/api/contacts');

    expect(res.body.items[0].firstName).toBe('Newer');
  });
});

describe('input validation', () => {
  it('caps the page size', async () => {
    const res = await request(app).get('/api/contacts?limit=200');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown sort field', async () => {
    const res = await request(app).get('/api/contacts?sortBy=password');

    expect(res.status).toBe(400);
  });

  it('rejects a reversed date range', async () => {
    const res = await request(app).get(
      '/api/contacts?createdFrom=2026-01-01&createdTo=2025-01-01',
    );

    expect(res.status).toBe(400);
  });
});

describe('fetching one contact', () => {
  it('returns the contact', async () => {
    const contact = await createContact({ firstName: 'Solo', email: 'solo@example.com' });

    const res = await request(app).get(`/api/contacts/${String(contact._id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Solo');
  });

  it('returns 404 for a well-formed id that does not exist', async () => {
    const res = await request(app).get('/api/contacts/000000000000000000000000');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/contacts/not-a-valid-id');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not leak internal search fields', async () => {
    const contact = await createContact({ email: 'shape@example.com' });

    const res = await request(app).get(`/api/contacts/${String(contact._id)}`);

    expect(Object.keys(res.body.data).sort()).toEqual([
      'company',
      'createdAt',
      'email',
      'firstName',
      'id',
      'lastName',
      'phone',
      'tags',
      'updatedAt',
      'version',
    ]);
  });
});
