import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { ContactModel } from '../src/models/contact.model.js';
import { ActivityModel } from '../src/models/activity.model.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  await ContactModel.syncIndexes();
  await ActivityModel.syncIndexes();
});

afterEach(async () => {
  await ContactModel.deleteMany({});
  await ActivityModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
