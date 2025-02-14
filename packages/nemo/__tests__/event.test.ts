import {
  FetchEvent,
  NemoEvent,
  NextFetchEvent,
  getWaitUntilPromiseFromEvent,
} from "../src/event";

describe("FetchEvent", () => {
  let mockRequest: Request;
  let mockWaitUntil: jest.Mock;

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockWaitUntil = jest.fn();
  });

  test("constructor initializes with internal waitUntil when no external provided", () => {
    const event = new FetchEvent(mockRequest);
    expect(event).toBeDefined();
  });

  test("constructor initializes with external waitUntil when provided", () => {
    const event = new FetchEvent(mockRequest, mockWaitUntil);
    event.waitUntil(Promise.resolve());
    expect(mockWaitUntil).toHaveBeenCalled();
  });

  test("respondWith sets response", async () => {
    const event = new FetchEvent(mockRequest);
    const mockResponse = new Response("test");
    event.respondWith(mockResponse);
    // @ts-expect-error - accessing private symbol
    const response = await event[Symbol.for("response")];
    expect(response).toBe(mockResponse);
  });

  test("passThroughOnException sets passThrough flag", () => {
    const event = new FetchEvent(mockRequest);
    event.passThroughOnException();
    // @ts-expect-error - accessing private symbol
    expect(event[Symbol.for("passThrough")]).toBe(true);
  });

  test("waitUntil with internal handling", async () => {
    const event = new FetchEvent(mockRequest);
    const promise = Promise.resolve("test");
    event.waitUntil(promise);
    const result = await getWaitUntilPromiseFromEvent(event);
    expect(result).toBeUndefined();
  });
});

describe("NextFetchEvent", () => {
  let mockRequest: Request;
  let mockContext: { waitUntil: jest.Mock };

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockContext = { waitUntil: jest.fn() };
  });

  test("constructor initializes with correct properties", () => {
    const event = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    expect(event.sourcePage).toBe("/test");
  });
});

describe("NemoEvent", () => {
  let mockRequest: Request;
  let mockContext: { waitUntil: jest.Mock };

  beforeEach(() => {
    mockRequest = new Request("https://example.com");
    mockContext = { waitUntil: jest.fn() };
  });

  test("constructor initializes with default context", () => {
    const event = new NemoEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    expect(event.context).toBeInstanceOf(Map);
    expect(event.context.size).toBe(0);
  });

  test("constructor initializes with provided context", () => {
    const customContext = new Map([["key", "value"]]);
    const event = new NemoEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
      nemo: customContext,
    });
    expect(event.context).toBe(customContext);
    expect(event.context.get("key")).toBe("value");
  });

  test("from method creates NemoEvent from NextFetchEvent", () => {
    const nextEvent = new NextFetchEvent({
      request: mockRequest as any,
      page: "/test",
      context: mockContext,
    });
    const customContext = new Map([["key", "value"]]);
    const nemoEvent = NemoEvent.from(nextEvent, customContext);

    expect(nemoEvent).toBeInstanceOf(NemoEvent);
    expect(nemoEvent.context).toBe(customContext);
    expect(nemoEvent.sourcePage).toBe("/");
  });
});
