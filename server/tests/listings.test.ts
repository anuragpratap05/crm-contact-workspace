import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createContact } from './factory.js';

const app = createApp();

describe('listing companies', () => {
  it('returns the distinct companies in use, sorted', async () => {
    await createContact({ email: 'a@example.com', company: 'Zenith Labs' });
    await createContact({ email: 'b@example.com', company: 'Acme Corp' });
    await createContact({ email: 'c@example.com', company: 'Acme Corp' });

    const res = await request(app).get('/api/companies');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['Acme Corp', 'Zenith Labs']);
  });

  it('excludes contacts that have no company', async () => {
    await createContact({ email: 'a@example.com', company: 'Acme Corp' });
    await createContact({ email: 'b@example.com', company: null });

    const res = await request(app).get('/api/companies');

    expect(res.body.data).toEqual(['Acme Corp']);
  });

  it('collapses companies that differ only by case', async () => {
    await createContact({ email: 'a@example.com', company: 'Acme Corp' });
    await createContact({ email: 'b@example.com', company: 'acme corp' });

    const res = await request(app).get('/api/companies');

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].toLowerCase()).toBe('acme corp');
  });

  it('offers only values the company filter actually matches', async () => {
    await createContact({ email: 'a@example.com', company: 'Acme Corp' });
    await createContact({ email: 'b@example.com', company: 'acme corp' });

    const listed = await request(app).get('/api/companies');

    for (const company of listed.body.data as string[]) {
      const filtered = await request(app).get(
        `/api/contacts?company=${encodeURIComponent(company)}`,
      );
      expect(filtered.body.pagination.total).toBe(2);
    }
  });

  it('returns an empty array when there are no contacts', async () => {
    const res = await request(app).get('/api/companies');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('listing tags', () => {
  it('returns the distinct tags in use, sorted', async () => {
    await createContact({ email: 'a@example.com', tags: ['VIP', 'Lead'] });
    await createContact({ email: 'b@example.com', tags: ['Lead'] });

    const res = await request(app).get('/api/tags');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['Lead', 'VIP']);
  });

  it('returns an empty array when no contact has tags', async () => {
    await createContact({ email: 'a@example.com', tags: [] });

    const res = await request(app).get('/api/tags');

    expect(res.body.data).toEqual([]);
  });
});
