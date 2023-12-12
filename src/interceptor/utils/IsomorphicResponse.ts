import { Headers } from 'headers-polyfill';
import { IncomingMessage } from 'http';
import {
  createHeadersFromIncomingHttpHeaders,
  getIncomingMessageBody
} from './getIncomingMessageBody';

export class IsomorphicResponse {
  public readonly status: number;
  public readonly statusText: string;
  public readonly headers: Headers;
  public readonly body: string;

  constructor(
    status: number,
    statusText: string,
    headers: Headers,
    body: string
  ) {
    this.status = status;
    this.statusText = statusText;
    this.headers = headers;
    this.body = body;
  }

  static async fromIncomingMessage(message: IncomingMessage) {
    const responseBody = await getIncomingMessageBody(message);

    return new IsomorphicResponse(
      message.statusCode || 200,
      message.statusMessage || 'OK',
      createHeadersFromIncomingHttpHeaders(message.headers),
      responseBody
    );
  }

  static async fromFetchResponse(
    response: Response
  ): Promise<IsomorphicResponse> {
    const responseClone = response.clone();
    const body = await responseClone.text();
    return new IsomorphicResponse(
      response.status || 200,
      response.statusText || 'OK',
      response.headers as Headers,
      body
    );
  }
}
