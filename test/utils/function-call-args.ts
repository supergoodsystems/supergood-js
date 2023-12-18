import { ErrorPayloadType, EventRequestType } from '../../src/types';

export const getEvents = (
  mockedPostEvents: jest.SpyInstance
): Array<EventRequestType> => {
  return Object.values(
    mockedPostEvents.mock.calls.flat()[1] as EventRequestType
  );
};

export const getErrors = (
  mockedPostError: jest.SpyInstance
): ErrorPayloadType => {
  return Object.values(
    mockedPostError.mock.calls.flat()
  )[1] as ErrorPayloadType;
};

export function checkPostedEvents(
  instance: jest.SpyInstance,
  eventsCount: number,
  eventContains: any
) {
  expect(instance).toHaveBeenCalledWith(
    expect.anything(),
    expect.toBeArrayOfSize(eventsCount),
    expect.any(Object)
  );
  expect(instance).toHaveBeenCalledWith(
    expect.anything(),
    expect.arrayContaining([expect.objectContaining(eventContains)]),
    expect.any(Object)
  );
}
