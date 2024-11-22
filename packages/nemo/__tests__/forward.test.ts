import { type NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import {
  forward,
  type MiddlewareFunction,
  type MiddlewareFunctionProps,
} from '../src';

describe('forward', () => {
  let mockRequest = new NextRequest('http://localhost/page1');
  let mockEvent = {} as NextFetchEvent;
  let mockContext = new Map<string, unknown>();

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost/page1');
    mockEvent = {} as NextFetchEvent;
    mockContext = new Map<string, unknown>();
  });

  it('forwards the response from a legacy middleware', async () => {
    const legacyMiddleware: MiddlewareFunction = (_request, _event) => {
      return new NextResponse('Legacy response');
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(legacyMiddleware, props);

    expect(props.forward).toHaveBeenCalledWith(expect.any(NextResponse));
    const response =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- intentional
      (props.forward as jest.Mock).mock.calls[0][0] as NextResponse;
    expect(await response.text()).toBe('Legacy response');
  });

  it('forwards the response from a new middleware', async () => {
    const newMiddleware: MiddlewareFunction = ({
      request: _request,
    }: {
      request: NextRequest;
    }) => {
      return new NextResponse('New response');
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(newMiddleware, props);

    expect(props.forward).toHaveBeenCalledWith(expect.any(NextResponse));
    const response =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- intentional
      (props.forward as jest.Mock).mock.calls[0][0] as NextResponse;
    expect(await response.text()).toBe('New response');
  });

  it('forwards undefined if middleware returns undefined', async () => {
    const undefinedMiddleware: MiddlewareFunction = () => {
      return undefined;
    };

    const props: MiddlewareFunctionProps = {
      request: mockRequest,
      event: mockEvent,
      context: mockContext,
      params: jest.fn(),
      forward: jest.fn(),
    };

    await forward(undefinedMiddleware, props);

    expect(props.forward).toHaveBeenCalledWith(undefined);
  });
});
