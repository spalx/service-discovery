import { GetServiceDTO } from '@spalx/service-discovery-pkg';
import { CorrelatedMessage, TransportAdapterName } from '@spalx/transport-pkg';

import serviceDiscoveryController from '@/controllers/service-discovery.controller';
import GetServiceCommand from './get-service.command';

jest.mock('@/controllers/service-discovery.controller', () => ({
  __esModule: true,
  default: {
    getService: jest.fn(),
    registerService: jest.fn(),
    deregisterService: jest.fn(),
    serviceHeartbeat: jest.fn(),
  },
}));

const OTHER_METHODS = (['getService', 'registerService', 'deregisterService', 'serviceHeartbeat'] as const).filter(
  (method) => method !== 'getService'
);

function buildRequest(): CorrelatedMessage<GetServiceDTO> {
  return CorrelatedMessage.create('c0ffee00-0000-4000-8000-000000000001', 'getService', TransportAdapterName.HTTP, {
    service_name: 'iam',
  });
}

describe('GetServiceCommand - execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the whole request to the controller', async () => {
    // Arrange
    const req = buildRequest();

    // Act
    await new GetServiceCommand().execute(req);

    // Assert
    expect(jest.mocked(serviceDiscoveryController.getService).mock.calls).toEqual([[req]]);
    for (const method of OTHER_METHODS) {
      expect(serviceDiscoveryController[method]).not.toHaveBeenCalled();
    }
  });

  it('should return the entry the controller returns', async () => {
    const service = { service_name: 'iam', host: 'iam', port: 3002 };
    jest.mocked(serviceDiscoveryController.getService).mockResolvedValueOnce(service);
    const req = buildRequest();

    await expect(new GetServiceCommand().execute(req)).resolves.toEqual(service);
  });

  it('should pass a controller error through', async () => {
    const error = new Error('service_name cannot be empty');
    jest.mocked(serviceDiscoveryController.getService).mockRejectedValueOnce(error);
    const req = buildRequest();

    await expect(new GetServiceCommand().execute(req)).rejects.toBe(error);
  });
});
