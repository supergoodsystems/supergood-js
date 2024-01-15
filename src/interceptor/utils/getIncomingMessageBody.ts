import { Headers } from 'headers-polyfill';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
import { PassThrough } from 'stream';
import * as zlib from 'zlib';

export function getIncomingMessageBody(
  response: IncomingMessage
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream =
      response.headers['content-encoding'] === 'gzip'
        ? response.pipe(zlib.createGunzip())
        : response;

    const encoding = response.readableEncoding || 'utf8';
    stream.setEncoding(encoding);

    let body = '';

    stream.on('data', (responseBody) => {
      body += responseBody;
    });

    stream.once('end', () => {
      resolve(body);
    });

    stream.once('error', (error) => {
      reject(error);
    });
  });
}

export function createHeadersFromIncomingHttpHeaders(
  httpHeaders: IncomingHttpHeaders
): Headers {
  const headers = new Headers();

  for (const headerName in httpHeaders) {
    const headerValues = httpHeaders[headerName];

    if (typeof headerValues === 'undefined') {
      continue;
    }

    if (Array.isArray(headerValues)) {
      headerValues.forEach((headerValue) => {
        headers.append(headerName, headerValue);
      });

      continue;
    }

    headers.set(headerName, headerValues);
  }

  return headers;
}
