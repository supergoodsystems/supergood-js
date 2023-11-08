import Supergood from '../src';
import { xtest, describe, expect } from '@jest/globals';
import postgres from 'postgres';
import axios from 'axios';
import crypto from 'node:crypto';

describe('end-to-end tests', () => {
  xtest('log to the staging database after a simple get request', async () => {
    await Supergood.init(
      {
        clientId: process.env.SUPERGOOD_CLIENT_ID as string,
        clientSecret: process.env.SUPERGOOD_CLIENT_SECRET as string
      },
      process.env.SUPERGOOD_BASE_URL
    );
    const queryId = `?id=${crypto.randomUUID()}`;
    const organizationId = process.env.SUPERGOOD_ORGANIZATION_ID as string;
    await axios.get(`https://supergood-testbed.herokuapp.com/200${queryId}`);
    await Supergood.close();
    // Sleep for 30 seconds as event is processed
    await new Promise((resolve) => setTimeout(resolve, 60000));
    const sql = postgres(process.env.DATABASE_URL as string);
    const events = await sql`
        SELECT
          COUNT(*)
        FROM events
        WHERE organization_id = ${organizationId} AND
        search = ${queryId}`;
    await sql.end({ timeout: 5 });
    expect(events[0].count).toEqual('1');
  }, 120000);
});
