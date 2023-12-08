import { RequestType, ResponseType } from './types';
import { prepareData, expandSensitiveKeySetForArrays, redactValuesFromKeys } from './utils';
import _get from 'lodash.get';

it('generates multiple sensitive key paths for an array', () => {
  const obj = {
    blog: {
      name: 'My Blog',
      posts: [
        {
          id: 1,
          title: 'json-server',
          author: 'typicode'
        },
        {
          id: 2,
          title: 'nodejs',
          author: 'alex'
        },
        {
          id: 3,
          title: 'typescript',
          author: 'zack'
        },
        {
          id: 4,
          title: 'python',
          author: 'steve'
        }
      ]
    }
  };
  const sensitiveKeys = ['blog.posts[].title'];
  expect(expandSensitiveKeySetForArrays(obj, sensitiveKeys)).toEqual([
    'blog.posts[0].title',
    'blog.posts[1].title',
    'blog.posts[2].title',
    'blog.posts[3].title'
  ]);
});

it('generates multiple sensitive key paths for an object with nested arrays', () => {
  const obj = {
    blog: {
      name: 'My Blog',
      posts: [
        {
          id: 1,
          title: 'json-server',
          author: 'typicode',
          comments: [
            {
              id: 1,
              body: 'some comment',
              postId: 1
            },
            {
              id: 2,
              body: 'some comment',
              postId: 1
            },
            {
              id: 3,
              body: 'some comment',
              postId: 1
            },
            {
              id: 4,
              body: 'some comment',
              postId: 1
            }
          ]
        },
        {
          id: 2,
          title: 'nodejs',
          author: 'alex',
          comments: [
            {
              id: 1,
              body: 'some comment',
              postId: 1
            },
            {
              id: 2,
              body: 'some comment',
              postId: 1
            },
            {
              id: 3,
              body: 'some comment',
              postId: 1
            }
          ]
        },
        {
          id: 3,
          title: 'typescript',
          author: 'zack',
          comments: [
            {
              id: 1,
              body: 'some comment',
              postId: 1
            },
            {
              id: 2,
              body: 'some comment',
              postId: 1
            }
          ]
        },
        {
          id: 4,
          title: 'python',
          author: 'steve',
          comments: [
            {
              id: 1,
              body: 'some comment',
              postId: 1
            }
          ]
        }
      ]
    }
  };
  const sensitiveKeys = ['blog.posts[].comments[].body'];
  expect(expandSensitiveKeySetForArrays(obj, sensitiveKeys)).toEqual([
    'blog.posts[0].comments[0].body',
    'blog.posts[0].comments[1].body',
    'blog.posts[0].comments[2].body',
    'blog.posts[0].comments[3].body',
    'blog.posts[1].comments[0].body',
    'blog.posts[1].comments[1].body',
    'blog.posts[1].comments[2].body',
    'blog.posts[2].comments[0].body',
    'blog.posts[2].comments[1].body',
    'blog.posts[3].comments[0].body'
  ]);
});

it('redacts values from keys with proper marshalling', () => {
  const MOCK_DATA_SERVER = 'http://localhost:3001';
  const obj = {
    request: {
      id: '',
      headers: {},
      method: 'GET',
      url: `${MOCK_DATA_SERVER}/posts`,
      path: '/posts',
      search: '',
      requestedAt: new Date(),
      body: {
        name: 'My Blog',
        posts: [
          {
            id: 1,
            title: 'json-server',
            author: 'typicode'
          },
          {
            id: 2,
            title: 'nodejs',
            author: 'alex'
          },
          {
            id: 3,
            title: 'typescript',
            author: 'zack'
          },
          {
            id: 4,
            title: 'python',
            author: 'steve'
          }
        ]
      }
    },
  };

  const remoteConfig = {
    [new URL(MOCK_DATA_SERVER).hostname]: {
      '/posts': {
        location: 'path',
        regex: '/posts',
        ignored: false,
        sensitiveKeys: ['request_body.posts[].title']
      }
    }
  };

  const redactedObj = redactValuesFromKeys(obj, remoteConfig);
  expect(_get(redactedObj, 'event.request.body.posts[0].title')).toBeNull();
  expect(redactedObj.sensitiveKeyMetadata[0]).toEqual({
    keyPath: "request_body.posts[0].title",
    type: "string",
    length: 11,
  })
});

it('redacts values from keys of nested array', () => {
  const MOCK_DATA_SERVER = 'http://localhost:3001';
  const obj = {
    request: {
      id: '',
      headers: {},
      method: 'GET',
      url: `${MOCK_DATA_SERVER}/posts`,
      path: '/posts',
      search: '',
      requestedAt: new Date(),
      body: {
        name: 'My Blog',
        posts: [
          {
            id: 1,
            title: 'json-server',
            author: 'typicode',
            comments: [
              {
                id: 1,
                body: 'some comment',
                postId: 1
              },
              {
                id: 2,
                body: 'some comment',
                postId: 1
              },
              {
                id: 3,
                body: 'some comment',
                postId: 1
              },
              {
                id: 4,
                body: 'some comment',
                postId: 1
              }
            ]
          },
          {
            id: 2,
            title: 'nodejs',
            author: 'alex',
            comments: [
              {
                id: 1,
                body: 'some comment',
                postId: 1
              },
              {
                id: 2,
                body: 'some comment',
                postId: 1
              },
              {
                id: 3,
                body: 'some comment',
                postId: 1
              }
            ]
          },
          {
            id: 3,
            title: 'typescript',
            author: 'zack',
            comments: [
              {
                id: 1,
                body: 'some comment',
                postId: 1
              },
              {
                id: 2,
                body: 'some comment',
                postId: 1
              }
            ]
          },
          {
            id: 4,
            title: 'python',
            author: 'steve',
            comments: [
              {
                id: 1,
                body: 'some comment',
                postId: 1
              }
            ]
          }
        ]
      }
    },
  };

  const remoteConfig = {
    [new URL(MOCK_DATA_SERVER).hostname]: {
      '/posts': {
        location: 'path',
        regex: '/posts',
        ignored: false,
        sensitiveKeys: ['request_body.posts[].comments[].body']
      }
    }
  };

  const redactedObj = redactValuesFromKeys(obj, remoteConfig);
  expect(_get(redactedObj, 'event.request.body.posts[0].comments[0].body')).toBeNull();
  expect(redactedObj.sensitiveKeyMetadata[0]).toEqual({
    keyPath: "request_body.posts[0].comments[0].body",
    type: "string",
    length: 12,
  })
});

it('will not blow up or redact anything if the sensitive key is bad', () => {
  const MOCK_DATA_SERVER = 'http://localhost:3001';
  const obj = {
    request: {
      id: '',
      headers: {},
      method: 'GET',
      url: `${MOCK_DATA_SERVER}/posts`,
      path: '/posts',
      search: '',
      requestedAt: new Date(),
      body: {
        name: 'My Blog',
        comments: [
          1,2,3,4
        ]
      }
    },
  };

  const remoteConfig = {
    [new URL(MOCK_DATA_SERVER).hostname]: {
      '/posts': {
        location: 'path',
        regex: '/posts',
        ignored: false,
        sensitiveKeys: ['request_body.posts[].title[]']
      }
    }
  };

  const redactedObj = redactValuesFromKeys(obj, remoteConfig);
  expect(_get(redactedObj, 'event.request.body.name')).toBeTruthy();
  expect(redactedObj.sensitiveKeyMetadata.length).toEqual(0)
});


it('will prepare the data appropriately for posting to the server', () => {
  const MOCK_DATA_SERVER = 'http://localhost:3001';
  const obj = {
    request: {
      id: '',
      headers: {},
      method: 'GET',
      url: `${MOCK_DATA_SERVER}/posts`,
      path: '/posts',
      search: '',
      requestedAt: new Date(),
      body: {},
    },
    response: {
      headers: {},
      status: 200,
      statusText: 'OK',
      respondedAt: new Date(),
      body: {
        name: 'My Blog',
        comments: [
          1,2,3,4
        ]
      }
    }
  };

  const remoteConfig = {
    [new URL(MOCK_DATA_SERVER).hostname]: {
      '/posts': {
        location: 'path',
        regex: '/posts',
        ignored: false,
        sensitiveKeys: ['response_body.comments']
      }
    }
  };

  const events = prepareData([obj], remoteConfig);
  console.log(JSON.stringify(events, null, 2))
  expect(_get(events[0], 'response.body.name')).toBeTruthy();
  expect(events[0].metadata.sensitiveKeys.length).toEqual(1)
});
