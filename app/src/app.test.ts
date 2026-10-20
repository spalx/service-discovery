import http from 'http';
import { AppRunPriority, IAppPkg } from '@spalx/app-life-cycle-pkg';
import { HTTPTransportAdapter } from '@spalx/http-transport-adapter';
import { ServiceDiscoveryAction } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage, TransportAdapterName, transportService } from '@spalx/transport-pkg';

import serviceDiscoveryController from '@/controllers/service-discovery.controller';

jest.mock('@/controllers/service-discovery.controller', () => ({
  __esModule: true,
  default: {
    getService: jest.fn(),
    registerService: jest.fn(),
    deregisterService: jest.fn(),
    serviceHeartbeat: jest.fn(),
  },
}));

type ActionHandler = (req: CorrelatedMessage) => Promise<object>;

// Each action, the controller method its command calls, and the request data it carries.
const ACTIONS: [action: ServiceDiscoveryAction, method: keyof typeof serviceDiscoveryController, data: object][] = [
  [ServiceDiscoveryAction.GetService, 'getService', { service_name: 'iam' }],
  [ServiceDiscoveryAction.RegisterService, 'registerService', { service_name: 'iam', host: 'iam', port: 3002 }],
  [ServiceDiscoveryAction.DeregisterService, 'deregisterService', { service_name: 'iam' }],
  [ServiceDiscoveryAction.ServiceHeartbeat, 'serviceHeartbeat', { service_name: 'iam', host: 'iam', port: 3002 }],
];

const NO_RESPONSE_ACTIONS = ACTIONS.filter(([action]) => action !== ServiceDiscoveryAction.GetService);

function buildRequest(action: string, data: object): CorrelatedMessage {
  return CorrelatedMessage.create('c0ffee00-0000-4000-8000-000000000001', action, TransportAdapterName.HTTP, data);
}

describe('App', () => {
  // Copied out in beforeAll, because clearMocks empties the spies' calls before each test.
  let registeredTransports: unknown[][];
  let listenCallCount: number;
  let app: IAppPkg;

  // The real transport service stores the handlers. It is a fresh singleton in each test file.
  function handlerFor(action: string): ActionHandler {
    const handler = transportService.getActionHandlers()[action];
    if (!handler) {
      throw new Error(`No handler registered for ${action}`);
    }
    return handler as ActionHandler;
  }

  beforeAll(async () => {
    const registerTransport = jest.spyOn(transportService, 'registerTransport');
    const listen = jest.spyOn(http.Server.prototype, 'listen');

    app = (await import('./app')).default;

    registeredTransports = [...registerTransport.mock.calls];
    listenCallCount = listen.mock.calls.length;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.mocked(serviceDiscoveryController.getService).mockReset();
    jest.mocked(serviceDiscoveryController.registerService).mockReset();
    jest.mocked(serviceDiscoveryController.deregisterService).mockReset();
    jest.mocked(serviceDiscoveryController.serviceHeartbeat).mockReset();
  });

  describe('App - constructor', () => {
    it('should register an HTTP transport and list it as a dependency', () => {
      // Assert
      expect(registeredTransports).toHaveLength(1);
      const [name, adapter] = registeredTransports[0];
      expect(name).toBe(TransportAdapterName.HTTP);
      expect(adapter).toBeInstanceOf(HTTPTransportAdapter);
      expect(app.getDependencies?.()).toEqual([transportService, adapter]);
    });

    it('should register one handler for each of the four actions', () => {
      expect(Object.keys(transportService.getActionHandlers()).sort()).toEqual(
        ACTIONS.map(([action]) => action).sort()
      );
    });

    it('should not start the HTTP server', () => {
      expect(listenCallCount).toBe(0);
    });
  });

  describe('App - action handlers', () => {
    it.each(ACTIONS)('should pass a %s request to the controller', async (action, method, data) => {
      // Arrange
      const req = buildRequest(action, data);

      // Act
      await handlerFor(action)(req);

      // Assert
      expect(jest.mocked(serviceDiscoveryController[method]).mock.calls).toEqual([[req]]);
    });

    it('should return the entry for a GetService request', async () => {
      const service = { service_name: 'iam', host: 'iam', port: 3002 };
      jest.mocked(serviceDiscoveryController.getService).mockResolvedValueOnce(service);

      const result = await handlerFor(ServiceDiscoveryAction.GetService)(
        buildRequest(ServiceDiscoveryAction.GetService, { service_name: 'iam' })
      );

      expect(result).toEqual(service);
    });

    it.each(NO_RESPONSE_ACTIONS)(
      'should return an empty object for a %s request, whatever the command returns',
      async (action, method, data) => {
        jest.mocked(serviceDiscoveryController[method]).mockResolvedValueOnce({ leaked: true } as never);

        const result = await handlerFor(action)(buildRequest(action, data));

        expect(result).toEqual({});
      }
    );

    it.each(ACTIONS)('should pass a %s error through', async (action, method, data) => {
      const error = new Error('Service not found');
      jest.mocked(serviceDiscoveryController[method]).mockRejectedValueOnce(error);

      await expect(handlerFor(action)(buildRequest(action, data))).rejects.toBe(error);
    });
  });

  describe('App - identity', () => {
    it('should be named service-discovery', () => {
      expect(app.getName()).toBe('service-discovery');
    });

    it('should run with high priority', () => {
      expect(app.getPriority?.()).toBe(AppRunPriority.High);
    });
  });
});
