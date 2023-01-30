import { HeaderOptionType } from './index.d';

const getHeaderOptions = (
  clientId: string,
  clientSecret: string
): HeaderOptionType => {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        clientId + ':' + clientSecret
      ).toString('base64')}`
    }
  };
};

export { getHeaderOptions };
