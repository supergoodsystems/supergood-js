import fetch from 'node-fetch';
import { get } from 'lodash';

import Supergood from '../../src';
import {
  MOCK_DATA_SERVER,
  SUPERGOOD_CLIENT_ID,
  SUPERGOOD_CLIENT_SECRET,
  SUPERGOOD_CONFIG,
  SUPERGOOD_SERVER
} from '../consts';
import { getEvents } from '../utils/function-call-args';
import { mockApi } from '../utils/mock-api';

describe('Custom tags', () => {
  it('should add custom tags to events via init', async () => {
    // Add your test code here
    const { postEventsMock } = mockApi();
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET,
        tags: {
          customTag: 'customValue'
        }
      },
      SUPERGOOD_SERVER
    );
    await fetch(`${MOCK_DATA_SERVER}/profile`);
    await Supergood.close();
    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted[0], 'metadata.tags.customTag')).toEqual(
      'customValue'
    );
  });

  it('should add custom tags to events via asyncLocalStorage', async () => {
    const { postEventsMock } = mockApi();
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );

    await Supergood.withTags({ tags: { call: 'A' } }, async () => {
      await fetch(`${MOCK_DATA_SERVER}/profile`);
    });

    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(1);
    expect(get(eventsPosted[0], 'metadata.tags.call')).toEqual('A');
  });

  it('should support nested contexts', async () => {
    const { postEventsMock } = mockApi();
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );

    await Supergood.withTags({ tags: { person: 'A' } }, async () => {
      await fetch(`${MOCK_DATA_SERVER}/profile`);
      await Supergood.withTags({ tags: { company: 'B' } }, async () => {
        await fetch(`${MOCK_DATA_SERVER}/profile`);
        await Supergood.withTags({ tags: { office: 'C' } }, async () => {
          await fetch(`${MOCK_DATA_SERVER}/profile`);
        });
      });
    });

    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(3);
    expect(get(eventsPosted[0], 'metadata.tags.person')).toEqual('A');
    expect(get(eventsPosted[1], 'metadata.tags.person')).toEqual('A');
    expect(get(eventsPosted[1], 'metadata.tags.company')).toEqual('B');
    expect(get(eventsPosted[2], 'metadata.tags.person')).toEqual('A');
    expect(get(eventsPosted[2], 'metadata.tags.company')).toEqual('B');
    expect(get(eventsPosted[2], 'metadata.tags.office')).toEqual('C');
  });

  it('should support traces', async () => {
    const { postEventsMock } = mockApi();
    await Supergood.init(
      {
        config: { ...SUPERGOOD_CONFIG, allowLocalUrls: true },
        clientId: SUPERGOOD_CLIENT_ID,
        clientSecret: SUPERGOOD_CLIENT_SECRET
      },
      SUPERGOOD_SERVER
    );

    await Supergood.withTags(
      { tags: { person: 'A' }, trace: '123' },
      async () => {
        await fetch(`${MOCK_DATA_SERVER}/profile`);
        await Supergood.withTags({ tags: { company: 'B' } }, async () => {
          await fetch(`${MOCK_DATA_SERVER}/profile`);
          await Supergood.withTags({ tags: { office: 'C' } }, async () => {
            await fetch(`${MOCK_DATA_SERVER}/profile`);
          });
        });
      }
    );

    await Supergood.close();

    const eventsPosted = getEvents(postEventsMock);
    expect(eventsPosted.length).toEqual(3);
    expect(get(eventsPosted[0], 'metadata.trace')).toEqual('123');
    expect(get(eventsPosted[1], 'metadata.trace')).toEqual('123');
    expect(get(eventsPosted[2], 'metadata.trace')).toEqual('123');
  });
});
