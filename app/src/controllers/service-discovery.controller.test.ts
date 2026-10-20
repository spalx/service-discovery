import { ServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage, TransportAdapterName } from '@spalx/transport-pkg';

import serviceDiscoveryService from '@/services/service-discovery.service';
import serviceDiscoveryController from './service-discovery.controller';

jest.mock('@/services/service-discovery.service', () => ({
  __esModule: true,
  default: {
    getService: jest.fn(),
    registerService: jest.fn(),
    deregisterService: jest.fn(),
    serviceHeartbeat: jest.fn(),
  },
}));

function buildRequest<T extends object>(data: T): CorrelatedMessage<T> {
  return CorrelatedMessage.create('c0ffee00-0000-4000-8000-000000000001', 'test', TransportAdapterName.HTTP, data);
}

function buildService(overrides: Partial<ServiceDTO> = {}): ServiceDTO {
  return { service_name: 'iam', host: 'iam', port: 3002, ...overrides };
}

// A request with a missing or wrong field, the schema's message for it, and a label for the test name.
const INVALID_SERVICES: [label: string, data: object, message: string][] = [
  ['an empty service_name', { service_name: '', host: 'iam', port: 3002 }, 'service_name cannot be empty'],
  ['a missing service_name', { host: 'iam', port: 3002 }, 'service_name must be a string'],
  ['an empty host', { service_name: 'iam', host: '', port: 3002 }, 'host cannot be empty'],
  ['a missing host', { service_name: 'iam', port: 3002 }, 'host must be a string'],
  ['a port of 0', { service_name: 'iam', host: 'iam', port: 0 }, 'port must be greater than 0'],
  ['a fractional port', { service_name: 'iam', host: 'iam', port: 3002.5 }, 'port must be an integer'],
  ['a port sent as text', { service_name: 'iam', host: 'iam', port: '3002' }, 'port must be an integer'],
];

const INVALID_NAMES: [label: string, data: object, message: string][] = [
  ['an empty service_name', { service_name: '' }, 'service_name cannot be empty'],
  ['a missing service_name', {}, 'service_name must be a string'],
  ['a numeric service_name', { service_name: 42 }, 'service_name must be a string'],
];

describe('ServiceDiscoveryController - getService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the entry the service finds', async () => {
    // Arrange
    const service = buildService();
    jest.mocked(serviceDiscoveryService.getService).mockResolvedValueOnce(service);
    const req = buildRequest({ service_name: 'iam' });

    // Act
    const result = await serviceDiscoveryController.getService(req);

    // Assert
    expect(result).toEqual(service);
    expect(serviceDiscoveryService.getService).toHaveBeenCalledWith(req.data);
  });

  it.each(INVALID_NAMES)('should reject %s without calling the service', async (_label, data, message) => {
    await expect(serviceDiscoveryController.getService(buildRequest(data) as never)).rejects.toMatchObject({
      name: 'ZodError',
      message: expect.stringContaining(message),
    });
    expect(serviceDiscoveryService.getService).not.toHaveBeenCalled();
  });

  it('should pass a service error through', async () => {
    const error = new Error('Service not found');
    jest.mocked(serviceDiscoveryService.getService).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryController.getService(buildRequest({ service_name: 'iam' }))).rejects.toBe(error);
  });
});

describe('ServiceDiscoveryController - registerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hand the request data to the service unchanged', async () => {
    // Arrange
    const data = { ...buildService(), version: '1.0.4' } as ServiceDTO;

    // Act
    await serviceDiscoveryController.registerService(buildRequest(data));

    // Assert
    expect(serviceDiscoveryService.registerService).toHaveBeenCalledTimes(1);
    expect(jest.mocked(serviceDiscoveryService.registerService).mock.calls[0][0]).toBe(data);
  });

  it('should accept the smallest valid port', async () => {
    await serviceDiscoveryController.registerService(buildRequest(buildService({ port: 1 })));

    expect(serviceDiscoveryService.registerService).toHaveBeenCalledTimes(1);
  });

  it.each(INVALID_SERVICES)('should reject %s without calling the service', async (_label, data, message) => {
    await expect(serviceDiscoveryController.registerService(buildRequest(data) as never)).rejects.toMatchObject({
      name: 'ZodError',
      message: expect.stringContaining(message),
    });
    expect(serviceDiscoveryService.registerService).not.toHaveBeenCalled();
  });

  it('should pass a service error through', async () => {
    const error = new Error('Connection is closed.');
    jest.mocked(serviceDiscoveryService.registerService).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryController.registerService(buildRequest(buildService()))).rejects.toBe(error);
  });
});

describe('ServiceDiscoveryController - deregisterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hand the request data to the service unchanged', async () => {
    const data = { service_name: 'iam' };

    await serviceDiscoveryController.deregisterService(buildRequest(data));

    expect(jest.mocked(serviceDiscoveryService.deregisterService).mock.calls).toEqual([[data]]);
  });

  it.each(INVALID_NAMES)('should reject %s without calling the service', async (_label, data, message) => {
    await expect(serviceDiscoveryController.deregisterService(buildRequest(data) as never)).rejects.toMatchObject({
      name: 'ZodError',
      message: expect.stringContaining(message),
    });
    expect(serviceDiscoveryService.deregisterService).not.toHaveBeenCalled();
  });

  it('should pass a service error through', async () => {
    const error = new Error('Connection is closed.');
    jest.mocked(serviceDiscoveryService.deregisterService).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryController.deregisterService(buildRequest({ service_name: 'iam' }))).rejects.toBe(
      error
    );
  });
});

describe('ServiceDiscoveryController - serviceHeartbeat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should hand the request data to the service unchanged', async () => {
    const data = buildService();

    await serviceDiscoveryController.serviceHeartbeat(buildRequest(data));

    expect(jest.mocked(serviceDiscoveryService.serviceHeartbeat).mock.calls).toEqual([[data]]);
  });

  it.each(INVALID_SERVICES)('should reject %s without calling the service', async (_label, data, message) => {
    await expect(serviceDiscoveryController.serviceHeartbeat(buildRequest(data) as never)).rejects.toMatchObject({
      name: 'ZodError',
      message: expect.stringContaining(message),
    });
    expect(serviceDiscoveryService.serviceHeartbeat).not.toHaveBeenCalled();
  });

  it('should pass a service error through', async () => {
    const error = new Error('Connection is closed.');
    jest.mocked(serviceDiscoveryService.serviceHeartbeat).mockRejectedValueOnce(error);

    await expect(serviceDiscoveryController.serviceHeartbeat(buildRequest(buildService()))).rejects.toBe(error);
  });
});
