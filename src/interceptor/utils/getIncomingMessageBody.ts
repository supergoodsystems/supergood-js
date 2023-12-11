import { Headers } from 'headers-polyfill';
import { IncomingMessage, IncomingHttpHeaders } from 'http';
import { PassThrough } from 'stream';
import * as zlib from 'zlib';

export function getIncomingMessageBody(
  response: IncomingMessage
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Pipe the original response to support non-clone
    // "response" input. No need to clone the response,
    // as we always have access to the full "response" input,
    // either a clone or an original one (in tests).
    const responseClone = response.pipe(new PassThrough());
    const stream =
      response.headers['content-encoding'] === 'gzip'
        ? responseClone.pipe(zlib.createGunzip())
        : responseClone;

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
