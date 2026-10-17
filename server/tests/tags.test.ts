import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createContact } from './factory.js';
import { ActivityModel } from '../src/models/activity.model.js';
import { ContactModel } from '../src/models/contact.model.js';

const app = createApp();

describe('adding and removing a tag', () => {
  it('adds a tag and records the activity', async () => {
    const contact = await createContact({ email: 'tag@example.com' });
    const id = String(contact._id);

    const res = await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'VIP' });

    expect(res.status).toBe(200);
    expect(res.body.data.tags).toEqual(['VIP']);

    const activities = await ActivityModel.find({ contactId: id }).lean();
    expect(activities).toHaveLength(1);
    expect(activities[0]?.type).toBe('TAG_ADDED');
    expect(activities[0]?.metadata).toEqual({ tag: 'VIP' });
  });

  it('is idempotent and does not log a second activity', async () => {
    const contact = await createContact({ email: 'tag@example.com' });
    const id = String(contact._id);

    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'VIP' });
    const second = await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'VIP' });

    expect(second.status).toBe(200);
    expect(second.body.data.tags).toEqual(['VIP']);
    expect(await ActivityModel.countDocuments({ contactId: id })).toBe(1);
  });

  it('removes a tag and records the activity', async () => {
    const contact = await createContact({ email: 'tag@example.com', tags: ['VIP', 'Lead'] });
    const id = String(contact._id);

    const res = await request(app).delete(`/api/contacts/${id}/tags/VIP`);

    expect(res.status).toBe(200);
    expect(res.body.data.tags).toEqual(['Lead']);

    const activity = await ActivityModel.findOne({ contactId: id }).lean();
    expect(activity?.type).toBe('TAG_REMOVED');
  });

  it('removing a tag the contact does not have is a no-op, not an error', async () => {
    const contact = await createContact({ email: 'tag@example.com', tags: ['Lead'] });
    const id = String(contact._id);

    const res = await request(app).delete(`/api/contacts/${id}/tags/NotThere`);

    expect(res.status).toBe(200);
    expect(res.body.data.tags).toEqual(['Lead']);
    expect(await ActivityModel.countDocuments({ contactId: id })).toBe(0);
  });

  it('handles a tag containing a space', async () => {
    const contact = await createContact({ email: 'tag@example.com' });
    const id = String(contact._id);

    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'Hot Lead' });
    const res = await request(app).delete(`/api/contacts/${id}/tags/${encodeURIComponent('Hot Lead')}`);

    expect(res.body.data.tags).toEqual([]);
  });

  it('never creates duplicates when the same tag is added concurrently', async () => {
    const contact = await createContact({ email: 'tag@example.com' });
    const id = String(contact._id);

    await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'Race' }),
      ),
    );

    const stored = await ContactModel.findById(id).lean();
    expect(stored?.tags.filter((t) => t === 'Race')).toHaveLength(1);
    expect(await ActivityModel.countDocuments({ contactId: id })).toBe(1);
  });

  it('returns 404 for a contact that does not exist', async () => {
    const res = await request(app)
      .post('/api/contacts/000000000000000000000000/tags')
      .send({ tag: 'VIP' });

    expect(res.status).toBe(404);
  });

  it('rejects an empty tag', async () => {
    const contact = await createContact({ email: 'tag@example.com' });

    const res = await request(app)
      .post(`/api/contacts/${String(contact._id)}/tags`)
      .send({ tag: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('tag');
  });

  it('rejects a tag longer than 40 characters', async () => {
    const contact = await createContact({ email: 'tag@example.com' });

    const res = await request(app)
      .post(`/api/contacts/${String(contact._id)}/tags`)
      .send({ tag: 'x'.repeat(41) });

    expect(res.status).toBe(400);
  });
});

describe('bulk tagging', () => {
  async function threeContacts() {
    return Promise.all([
      createContact({ firstName: 'One', email: 'one@example.com' }),
      createContact({ firstName: 'Two', email: 'two@example.com' }),
      createContact({ firstName: 'Three', email: 'three@example.com' }),
    ]);
  }

  it('adds a tag to every selected contact', async () => {
    const contacts = await threeContacts();
    const contactIds = contacts.map((c) => String(c._id));

    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ matched: 3, modified: 3, action: 'add' });

    const tagged = await request(app).get('/api/contacts?tags=Roadshow');
    expect(tagged.body.pagination.total).toBe(3);
  });

  it('reports modified: 0 when every contact already has the tag', async () => {
    const contacts = await threeContacts();
    const contactIds = contacts.map((c) => String(c._id));

    await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    const second = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    expect(second.body.data).toMatchObject({ matched: 3, modified: 0 });
    expect(await ActivityModel.countDocuments({})).toBe(3);
  });

  it('removes a tag in bulk', async () => {
    const contacts = await threeContacts();
    const contactIds = contacts.map((c) => String(c._id));

    await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds: contactIds.slice(0, 2), tag: 'Roadshow', action: 'remove' });

    expect(res.body.data).toMatchObject({ matched: 2, modified: 2, action: 'remove' });

    const remaining = await request(app).get('/api/contacts?tags=Roadshow');
    expect(remaining.body.pagination.total).toBe(1);
  });

  it('records one activity per contact that actually changed', async () => {
    const contacts = await threeContacts();
    const contactIds = contacts.map((c) => String(c._id));

    await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    const activities = await ActivityModel.find({}).lean();
    expect(activities).toHaveLength(3);
    expect(activities.every((a) => a.type === 'TAG_ADDED')).toBe(true);
    expect(activities[0]?.metadata).toEqual({ tag: 'Roadshow', bulk: true });
  });

  it('ignores ids that do not exist', async () => {
    const contacts = await threeContacts();
    const contactIds = [
      ...contacts.map((c) => String(c._id)),
      '000000000000000000000000',
    ];

    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds, tag: 'Roadshow', action: 'add' });

    expect(res.body.data).toMatchObject({ matched: 3, modified: 3 });
  });

  it('rejects an empty selection', async () => {
    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds: [], tag: 'X', action: 'add' });

    expect(res.status).toBe(400);
  });

  it('rejects more than 500 contacts', async () => {
    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({
        contactIds: Array.from({ length: 501 }, () => '000000000000000000000000'),
        tag: 'X',
        action: 'add',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown action', async () => {
    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds: ['000000000000000000000000'], tag: 'X', action: 'destroy' });

    expect(res.status).toBe(400);
  });

  it('reports which id in the list was malformed', async () => {
    const res = await request(app)
      .post('/api/contacts/tags/bulk')
      .send({ contactIds: ['000000000000000000000000', 'nope'], tag: 'X', action: 'add' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('contactIds.1');
  });
});

describe('activity history endpoint', () => {
  it('returns activity newest first', async () => {
    const contact = await createContact({ email: 'hist@example.com' });
    const id = String(contact._id);

    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'First' });
    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'Second' });
    await request(app).delete(`/api/contacts/${id}/tags/First`);

    const res = await request(app).get(`/api/contacts/${id}/activities`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].type).toBe('TAG_REMOVED');
  });

  it('returns 404 for a contact that does not exist', async () => {
    const res = await request(app).get('/api/contacts/000000000000000000000000/activities');

    expect(res.status).toBe(404);
  });

  it('caps the limit', async () => {
    const contact = await createContact({ email: 'hist@example.com' });

    const res = await request(app).get(
      `/api/contacts/${String(contact._id)}/activities?limit=500`,
    );

    expect(res.status).toBe(400);
  });
});
