import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createContact } from './factory.js';
import { ActivityModel } from '../src/models/activity.model.js';

const app = createApp();

const BASE = {
  firstName: 'Laura',
  lastName: 'Wilson',
  email: 'laura.wilson@example.com',
  phone: '+1-555-0100',
  company: 'Lumen Analytics',
};

function body(overrides: Record<string, unknown> = {}) {
  return { ...BASE, ...overrides };
}

function makeContact() {
  return createContact(BASE);
}

describe('optimistic locking', () => {
  it('rejects an update that carries a stale version', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    const first = await request(app)
      .put(`/api/contacts/${id}`)
      .send(body({ company: 'Changed by B', version: 0 }));

    expect(first.status).toBe(200);
    expect(first.body.data.version).toBe(1);

    const stale = await request(app)
      .put(`/api/contacts/${id}`)
      .send(body({ company: 'Changed by A', version: 0 }));

    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('returns the current server state so the client can show what changed', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    await request(app).put(`/api/contacts/${id}`).send(body({ company: 'Winner', version: 0 }));

    const stale = await request(app)
      .put(`/api/contacts/${id}`)
      .send(body({ company: 'Loser', version: 0 }));

    expect(stale.body.error.details.current).toMatchObject({
      id,
      company: 'Winner',
      version: 1,
    });
  });

  it('allows exactly one winner when many writers race on the same version', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app)
          .put(`/api/contacts/${id}`)
          .send(body({ firstName: `Writer${i}`, version: 0 })),
      ),
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
  });

  it('increments the version on each successful save', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    for (let version = 0; version < 3; version += 1) {
      const res = await request(app)
        .put(`/api/contacts/${id}`)
        .send(body({ firstName: `Edit${version}`, version }));

      expect(res.status).toBe(200);
      expect(res.body.data.version).toBe(version + 1);
    }
  });

  it('does not log an activity when nothing actually changed', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    await request(app).put(`/api/contacts/${id}`).send(body({ version: 0 }));

    expect(await ActivityModel.countDocuments({ contactId: id })).toBe(0);
  });

  it('records which fields changed', async () => {
    const contact = await makeContact();
    const id = String(contact._id);

    await request(app)
      .put(`/api/contacts/${id}`)
      .send(body({ company: 'New Co', phone: '+1-555-9999', version: 0 }));

    const activity = await ActivityModel.findOne({ contactId: id }).lean();
    expect(activity?.type).toBe('CONTACT_UPDATED');
    expect(activity?.metadata).toEqual({ fields: ['phone', 'company'] });
  });
});

describe('email uniqueness', () => {
  it('rejects an update that would duplicate another contact email', async () => {
    const taken = await createContact({ email: 'taken@example.com' });
    const other = await createContact({ firstName: 'Other', email: 'free@example.com' });

    const res = await request(app)
      .put(`/api/contacts/${String(other._id)}`)
      .send(body({ email: 'taken@example.com', version: 0 }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    expect(String(taken._id)).not.toBe(String(other._id));
  });

  it('allows many contacts to have no email at all', async () => {
    await createContact({ firstName: 'NoEmailOne', email: null });
    await createContact({ firstName: 'NoEmailTwo', email: null });
    await createContact({ firstName: 'NoEmailThree', email: null });

    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(3);
  });

  it('lets a contact keep its own email when updating other fields', async () => {
    const contact = await createContact({ email: 'keep@example.com' });

    const res = await request(app)
      .put(`/api/contacts/${String(contact._id)}`)
      .send(body({ email: 'keep@example.com', company: 'Renamed', version: 0 }));

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('keep@example.com');
  });
});
